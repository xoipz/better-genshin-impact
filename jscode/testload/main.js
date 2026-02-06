// testload
// Created by Agent

// 1. Create the HTML panel
// ID: "testload", Width: 400, Height: 300
htmlPanel.create("testload", 800, 600); // Increased size to fit the new UI better

// 2. Read the HTML content from file
const htmlContent = file.readTextSync("status.html");

if (htmlContent) {
    // 3. Load the HTML into the panel
    htmlPanel.loadHtml("testload", htmlContent);
    // 4. Show the panel
    htmlPanel.show("testload");
    log.info("testload script loaded and HTML content from status.html displayed.");
} else {
    log.error("Failed to read status.html");
}

while (true) {
    sleep(10000);
}

