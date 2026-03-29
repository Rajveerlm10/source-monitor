const express = require('express');
const app = express();

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
  // You can include view-source: here, the bot will automatically remove it to fetch,
  // and will not include it in the Telegram message.
  targetUrl: "view-source:https://in.bookmyshow.com/sports/mumbai-indians-vs-royal-challengers-bengaluru/ET00491196", 
  
  searchText: "Sold out", // Case insensitive exact match
  
  // mode can be "present" (alert if found) OR "absent" (alert if NOT found)
  mode: "present", 
  
  // Interval in minutes and seconds
  intervalMin: 1,
  intervalSec: 00,

  // Telegram Credentials (Provided by you)
  telegramToken: "8578527102:AAF0q3vpxQ-SNkzpoFfpoyTUZrFAbNpvoTc",
  chatId: "637595271"
};

// ==========================================
// 2. BOT LOGIC
// ==========================================
let isCurrentlyAlerting = false; // Prevents spamming every single minute

async function checkSourceCode() {
  console.log(`[${new Date().toISOString()}] Checking URL...`);
  
  // Clean the URL (remove view-source: if user pasted it)
  let fetchUrl = CONFIG.targetUrl.trim();
  if (fetchUrl.toLowerCase().startsWith('view-source:')) {
    fetchUrl = fetchUrl.substring(12);
  }

  try {
    const response = await fetch(fetchUrl);
    const sourceCode = await response.text();
    
    const sourceLower = sourceCode.toLowerCase();
    const searchLower = CONFIG.searchText.toLowerCase();
    
    const isPresent = sourceLower.includes(searchLower);
    
    let conditionMet = false;
    let alertMessage = "";

    if (CONFIG.mode === "present" && isPresent) {
      conditionMet = true;
      alertMessage = `✅ *TEXT FOUND*\n\nYour target text "${CONFIG.searchText}" was found in the code!\n\n*URL:* ${fetchUrl}`;
    } else if (CONFIG.mode === "absent" && !isPresent) {
      conditionMet = true;
      alertMessage = `❌ *TEXT MISSING*\n\nYour target text "${CONFIG.searchText}" is NOT in the code!\n\n*URL:* ${fetchUrl}`;
    }

    // Only send if the condition is met AND we haven't already sent an alert for this state
    if (conditionMet && !isCurrentlyAlerting) {
      sendTelegramAlert(alertMessage);
      isCurrentlyAlerting = true; // Stop spamming until condition changes
    } else if (!conditionMet && isCurrentlyAlerting) {
      // Reset the alert state if the condition is no longer met
      isCurrentlyAlerting = false; 
      console.log("Condition no longer met. Resetting alert state.");
    }

  } catch (error) {
    console.error("Error fetching URL:", error.message);
  }
}

function sendTelegramAlert(textMsg) {
  const telegramApiUrl = `https://api.telegram.org/bot${CONFIG.telegramToken}/sendMessage`;
  
  fetch(telegramApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CONFIG.chatId,
      text: textMsg,
      parse_mode: 'Markdown'
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.ok) console.log("Telegram alert sent successfully!");
    else console.error("Telegram API Error:", data.description);
  })
  .catch(err => console.error("Network error sending Telegram alert:", err));
}

// ==========================================
// 3. START LOOP & WEB SERVER
// ==========================================
// Calculate milliseconds
const intervalMs = ((CONFIG.intervalMin * 60) + CONFIG.intervalSec) * 1000;

// Start the loop
setInterval(checkSourceCode, intervalMs);
checkSourceCode(); // Run once immediately

// Dummy web server required by Render to keep the app alive
app.get('/', (req, res) => {
  res.send('Source Monitor Bot is running 24/7!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server listening on port ${PORT}`);
});
