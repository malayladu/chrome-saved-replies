const replyForm = document.getElementById("replyForm");
const replyList = document.getElementById("replyList");

function loadReplies() {
  chrome.storage.local.get(["replies"], (result) => {
    replyList.innerHTML = "";
    const replies = result.replies || [];
    replies.forEach((reply, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${reply.title}</strong> (${reply.tag || ""})
        <p>${reply.content}</p>
        <button data-index="${index}" class="insert">Insert</button>
        <button data-index="${index}" class="edit">Edit</button>
        <button data-index="${index}" class="delete">Delete</button>
      `;
      replyList.appendChild(li);
    });
  });
}

replyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const tag = document.getElementById("tag").value;

  chrome.storage.local.get(["replies"], (result) => {
    const replies = result.replies || [];
    replies.push({ title, content, tag });
    chrome.storage.local.set({ replies }, loadReplies);
    replyForm.reset();
  });
});

replyList.addEventListener("click", (e) => {
  const index = e.target.dataset.index;
  if (e.target.classList.contains("delete")) {
    chrome.storage.local.get(["replies"], (result) => {
      const replies = result.replies || [];
      replies.splice(index, 1);
      chrome.storage.local.set({ replies }, loadReplies);
    });
  }

  if (e.target.classList.contains("insert")) {
    chrome.storage.local.get(["replies"], (result) => {
      const reply = result.replies[index];
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: insertReplyAtCursor,
          args: [reply.content]
        });
      });
    });
  }

  if (e.target.classList.contains("edit")) {
    chrome.storage.local.get(["replies"], (result) => {
      const reply = result.replies[index];
      document.getElementById("title").value = reply.title;
      document.getElementById("content").value = reply.content;
      document.getElementById("tag").value = reply.tag || "";
      result.replies.splice(index, 1);
      chrome.storage.local.set({ replies: result.replies }, loadReplies);
    });
  }
});

function insertReplyAtCursor(text) {
  const activeElement = document.activeElement;
  console.log(activeElement);
  if (activeElement && (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "DIV" || activeElement.isContentEditable)) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;

    if (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT") {
      // Handle regular input/textarea elements
      const value = activeElement.value;
      activeElement.value = value.slice(0, start) + text + value.slice(end);
    } else if (activeElement.isContentEditable) {
      // Handle contentEditable elements
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
    }
    //activeElement.value = value.slice(0, start) + text + value.slice(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
    activeElement.focus();
  }
}

loadReplies();