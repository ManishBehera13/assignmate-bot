require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

// 1. Configuration & Initialization
const token = process.env.BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const bot = new TelegramBot(token, { polling: true });
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. State Management (In-Memory)
const userState = new Map();

const STATES = {
    WAITING_FOR_NAME: 'WAITING_FOR_NAME',
    WAITING_FOR_PHONE: 'WAITING_FOR_PHONE',
    SELECTING_SERVICE: 'SELECTING_SERVICE',
    WAITING_FOR_NOTES_FILE: 'WAITING_FOR_NOTES_FILE',
    WAITING_FOR_MODULES: 'WAITING_FOR_MODULES',
    WAITING_FOR_ASSIGNMENT_FILE: 'WAITING_FOR_ASSIGNMENT_FILE',
    WAITING_FOR_PAYMENT: 'WAITING_FOR_PAYMENT'
};

// 3. Helper Functions

// Download file from Telegram
async function downloadTelegramFile(fileId) {
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios({
        url: fileLink,
        method: 'GET',
        responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
}

// Upload to Supabase Storage
async function uploadToSupabase(buffer, bucket, filename, mimeType) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, buffer, {
            contentType: mimeType,
            upsert: true
        });

    if (error) throw error;
    
    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);
        
    return publicUrl;
}

function showMainMenu(chatId) {
    const menu = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📘 Notes", callback_data: "service_notes" },
                    { text: "📝 Assignments", callback_data: "service_assignments" }
                ]
            ]
        }
    };
    bot.sendMessage(chatId, "📚 *AssignMate Menu*\n\nWhich service do you want?", { parse_mode: 'Markdown', ...menu });
}

// 4. Realtime Subscription for Admin Notifications
supabase
    .channel('admin-approval')
    .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assignments' },
        async (payload) => {
            console.log("🔔 Realtime Update Received:", payload.new);
            const { user_id, payment_status } = payload.new;

            if (payment_status === 'verified') {
                console.log(`✅ Notifying User ${user_id}: Verified`);
                await bot.sendMessage(user_id, "✅ *Payment verified!* Your work has started.", { parse_mode: 'Markdown' });
            } else if (payment_status === 'rejected') {
                console.log(`❌ Notifying User ${user_id}: Rejected`);
                await bot.sendMessage(user_id, "❌ *Payment not valid.* Please upload again or contact support.", { parse_mode: 'Markdown' });
            }
        }
    )
    .subscribe((status) => {
        console.log("📡 Realtime Subscription Status:", status);
    });

// Start sequence: Clear Webhook
(async () => {
    try {
        await bot.deleteWebHook();
        console.log("✅ Webhook cleared. AssignMate Bot is active.");
    } catch (e) {
        console.error("❌ Startup Error:", e.message);
    }
})();

// --- TELEGRAM BOT LOGIC ---

// /start Command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        // Check if user exists
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', chatId.toString())
            .single();

        if (user) {
            userState.set(chatId, { state: STATES.SELECTING_SERVICE });
            return showMainMenu(chatId);
        }

        // New User Onboarding
        userState.set(chatId, { state: STATES.WAITING_FOR_NAME, data: {} });
        await bot.sendMessage(chatId, "👋 *Welcome to AssignMate!*\nWe help you complete assignments and notes easily.\n\n🧑 Please enter your *full name* (alphabets only):", { parse_mode: 'Markdown' });

    } catch (err) {
        console.error("Start Error:", err);
        bot.sendMessage(chatId, "⚠️ System error. Please try again later.");
    }
});

// Callback Query Handler
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('service_')) {
        const service = data.split('_')[1];
        if (service === 'notes') {
            userState.set(chatId, { state: STATES.WAITING_FOR_NOTES_FILE, data: { service: 'notes' } });
            bot.sendMessage(chatId, "📄 Please upload your notes file (*PDF, DOCX, or Image*):", { parse_mode: 'Markdown' });
        } else {
            userState.set(chatId, { state: STATES.WAITING_FOR_MODULES, data: { service: 'assignments' } });
            bot.sendMessage(chatId, "🔢 How many modules do you have? (Enter a number, e.g., 5)");
        }
    }

    if (data === 'accept_price' || data === 'reject_price') {
        const state = userState.get(chatId);
        if (!state || !state.data) return bot.answerCallbackQuery(query.id, { text: "Session expired." });

        if (data === 'reject_price') {
            bot.sendMessage(chatId, "❌ Order cancelled. Use /start to begin again.");
            userState.delete(chatId);
            return;
        }

        // Accept Flow
        const advance = Math.round(state.data.price * 0.5);
        state.state = STATES.WAITING_FOR_PAYMENT;
        state.data.advance = advance;
        
        // Save Order to DB
        const { data: order, error } = await supabase
            .from('assignments')
            .insert([{
                user_id: chatId.toString(),
                service_type: state.data.service,
                file_url: state.data.fileUrl || null,
                price: state.data.price,
                payment_status: 'pending',
                order_status: 'waiting_payment_verification'
            }])
            .select();

        if (error) {
            console.error("DB Error:", error);
            return bot.sendMessage(chatId, "⚠️ Error creating order. Please try again.");
        }

        state.data.orderId = order[0].id;
        userState.set(chatId, state);

        const paymentMsg = `💳 *Payment Required*\n\nPlease pay *₹${advance}* (50% advance) to start work.\n\n` +
                          `📌 *UPI:* ` + "`beherachintu85@ybl`" + `\n\n` +
                          `📸 After payment, upload the *screenshot* here.`;
        
        // Use local Qr.jpeg
        const qrPath = path.join(__dirname, 'Qr.jpeg');
        if (fs.existsSync(qrPath)) {
            bot.sendPhoto(chatId, qrPath, {
                caption: paymentMsg,
                parse_mode: 'Markdown'
            });
        } else {
            bot.sendMessage(chatId, paymentMsg, { parse_mode: 'Markdown' });
        }
    }

    bot.answerCallbackQuery(query.id);
});

// Message Handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const stateObj = userState.get(chatId);

    if (!stateObj || msg.text?.startsWith('/')) return;

    // --- Onboarding Flow ---

    if (stateObj.state === STATES.WAITING_FOR_NAME && msg.text) {
        const name = msg.text.trim();
        if (!/^[A-Z a-z]+$/.test(name)) {
            return bot.sendMessage(chatId, "❌ *Invalid name.* Please use only alphabets.", { parse_mode: 'Markdown' });
        }

        stateObj.data.name = name;
        stateObj.state = STATES.WAITING_FOR_PHONE;
        bot.sendMessage(chatId, "📱 Please enter your *10-digit phone number*:", { parse_mode: 'Markdown' });
        return;
    }

    if (stateObj.state === STATES.WAITING_FOR_PHONE && msg.text) {
        const phone = msg.text.trim();
        if (!/^\d{10}$/.test(phone)) {
            return bot.sendMessage(chatId, "❌ *Invalid phone number.* Please enter a valid 10-digit number.", { parse_mode: 'Markdown' });
        }

        try {
            // Save User to Database
            const { error } = await supabase
                .from('users')
                .insert([{
                    telegram_id: chatId.toString(),
                    name: stateObj.data.name,
                    phone: phone
                }]);

            if (error) throw error;

            bot.sendMessage(chatId, "✅ *Registration complete!*", { parse_mode: 'Markdown' });
            stateObj.state = STATES.SELECTING_SERVICE;
            showMainMenu(chatId);
        } catch (err) {
            console.error("Save User Error:", err);
            bot.sendMessage(chatId, "⚠️ Error saving profile. Please try again.");
        }
        return;
    }

    // --- Service Flow ---

    if (stateObj.state === STATES.WAITING_FOR_MODULES && msg.text) {
        const modules = parseInt(msg.text);
        if (isNaN(modules)) return bot.sendMessage(chatId, "❌ Invalid input. Please enter a number.");

        stateObj.data.modules = modules;
        stateObj.state = STATES.WAITING_FOR_ASSIGNMENT_FILE; 
        
        bot.sendMessage(chatId, `✅ *Modules saved:* ${modules}\n\n📄 Now, please upload your assignment documents (*PDF, DOCX, or Image*):`, { parse_mode: 'Markdown' });
    }

    if (stateObj.state === STATES.WAITING_FOR_ASSIGNMENT_FILE && (msg.document || msg.photo)) {
        bot.sendMessage(chatId, "⏳ Processing assignment files... please wait.");
        
        try {
            let buffer, fileId, fileName, mimeType;

            if (msg.document) {
                fileId = msg.document.file_id;
                fileName = msg.document.file_name;
                mimeType = msg.document.mime_type;
            } else if (msg.photo) {
                fileId = msg.photo[msg.photo.length - 1].file_id;
                fileName = `assignment_${Date.now()}.jpg`;
                mimeType = 'image/jpeg';
            }

            buffer = await downloadTelegramFile(fileId);
            const publicUrl = await uploadToSupabase(buffer, 'assignments', `assignments/${Date.now()}_${fileName}`, mimeType);
            
            const modules = stateObj.data.modules;
            let price = (modules === 5) ? 350 : modules * 80;
            
            stateObj.data.price = price;
            stateObj.data.fileUrl = publicUrl;

            bot.sendMessage(chatId, `🔢 *Modules:* ${modules}\n📄 *Files:* Received\n💰 *Total Price:* ₹${price}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ Accept & Pay", callback_data: "accept_price" }, { text: "❌ Reject", callback_data: "reject_price" }]
                    ]
                }
            });
        } catch (err) {
            console.error("Assignment File Error:", err);
            bot.sendMessage(chatId, "❌ Error processing file. Please try again.");
        }
    }

    if (stateObj.state === STATES.WAITING_FOR_NOTES_FILE && (msg.document || msg.photo)) {
        bot.sendMessage(chatId, "⏳ Processing file... please wait.");
        
        try {
            let buffer, fileId, fileName, mimeType;

            if (msg.document) {
                fileId = msg.document.file_id;
                fileName = msg.document.file_name;
                mimeType = msg.document.mime_type;
            } else if (msg.photo) {
                fileId = msg.photo[msg.photo.length - 1].file_id;
                fileName = `image_${Date.now()}.jpg`;
                mimeType = 'image/jpeg';
            }

            buffer = await downloadTelegramFile(fileId);
            const publicUrl = await uploadToSupabase(buffer, 'assignments', `notes/${Date.now()}_${fileName}`, mimeType);
            
            let pages = 1;
            if (mimeType === 'application/pdf') {
                const pdfData = await pdfParse(buffer);
                pages = pdfData.numpages;
            } else if (fileName.endsWith('.docx')) {
                const { value } = await mammoth.extractRawText({ buffer });
                const wordCount = value.split(/\s+/).length;
                pages = Math.ceil(wordCount / 300);
            }

            const totalPrice = pages * 30;
            stateObj.data.pages = pages;
            stateObj.data.price = totalPrice;
            stateObj.data.fileUrl = publicUrl;

            bot.sendMessage(chatId, `📄 *Total Pages:* ${pages}\n💰 *Price:* ₹${totalPrice}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ Accept & Pay", callback_data: "accept_price" }, { text: "❌ Reject", callback_data: "reject_price" }]
                    ]
                }
            });
        } catch (err) {
            console.error("File Error:", err);
            bot.sendMessage(chatId, "❌ Error processing file.");
        }
    }

    if (stateObj.state === STATES.WAITING_FOR_PAYMENT && msg.photo) {
        bot.sendMessage(chatId, "🔄 Uploading payment proof...");
        
        try {
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            const buffer = await downloadTelegramFile(fileId);
            const proofUrl = await uploadToSupabase(buffer, 'payments', `proof/${stateObj.data.orderId}.jpg`, 'image/jpeg');

            const { error } = await supabase
                .from('assignments')
                .update({ 
                    payment_screenshot_url: proofUrl,
                    order_status: 'waiting_payment_verification'
                })
                .eq('id', stateObj.data.orderId);

            if (error) throw error;

            bot.sendMessage(chatId, "✅ *Screenshot uploaded!* Please wait for admin approval. You will be notified here once verified.", { parse_mode: 'Markdown' });
            userState.delete(chatId);
        } catch (err) {
            console.error("Payment proof error:", err);
            bot.sendMessage(chatId, "⚠️ Failed to save payment screenshot. Please try again.");
        }
    }
});

bot.on('polling_error', (error) => console.log("Polling Error:", error.message));
bot.on('error', (error) => console.log("General Error:", error));

// 5. Render Health Check Server (Satisfies "No open ports detected" error)
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('AssignMate Bot remains active!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Health check server listening on port ${PORT}`);
});