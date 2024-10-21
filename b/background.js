chrome.runtime.onInstalled.addListener(() => {
  console.log('Blurt extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "save_comment") {
    console.log(`Comment saved: ${message.comment}`);
    sendResponse({status: 'Comment stored'});
  }
});
