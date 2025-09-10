const replyForm = document.getElementById("replyForm");
const replyContainer = document.getElementById("replyContainer");
const filterTag = document.getElementById("filterTag");
const filterCategory = document.getElementById("filterCategory");

// Initialize Quill editor
const quill = new Quill('#editor', {
	theme: 'snow',
	placeholder: "Write your reply here..."
});

function loadReplies() {
	chrome.storage.local.get(["replies"], (result) => {
		replyContainer.innerHTML = "";
		const replies = result.replies || [];

		// Build category dropdown
		const categories = [...new Set(replies.map(r => r.category).filter(String))];
		filterCategory.innerHTML = `<option value="">All Categories</option>`;
		categories.forEach(cat => {
			const opt = document.createElement("option");
			opt.value = cat;
			opt.textContent = cat;
			filterCategory.appendChild(opt);
		});

		const tagFilter = filterTag.value.toLowerCase();
		const categoryFilter = filterCategory.value;

		replies
			.filter(reply => {
				const matchesTag = !tagFilter || (reply.tag && reply.tag.toLowerCase().includes(tagFilter));
				const matchesCategory = !categoryFilter || reply.category === categoryFilter;
				return matchesTag && matchesCategory;
			})
			.forEach((reply, index) => {
				const card = document.createElement("div");
				card.className = "card";

				// Render tags as badges
				const tagsHtml = (reply.tag || "")
					.split(",")
					.filter(t => t.trim())
					.map(t => `<span class="tag">${t.trim()}</span>`)
					.join(" ");

				card.innerHTML = `
          <div class="card-header">
            <strong>${reply.title}</strong>
            <span class="category">${reply.category || ""}</span>
          </div>
          <div class="reply-content">${reply.content}</div>
          <div class="tags">${tagsHtml}</div>
          <div class="actions">
            <button data-index="${index}" class="btn insert">Insert</button>
            <button data-index="${index}" class="btn edit">Edit</button>
            <button data-index="${index}" class="btn delete">Delete</button>
          </div>
        `;
				replyContainer.appendChild(card);
			});
	});
}

replyForm.addEventListener("submit", (e) => {
	e.preventDefault();
	const title = document.getElementById("title").value;
	const content = quill.root.innerHTML; // Save HTML
	const tag = document.getElementById("tag").value;
	const category = document.getElementById("category").value;

	chrome.storage.local.get(["replies"], (result) => {
		const replies = result.replies || [];
		replies.push({title, content, tag, category});
		chrome.storage.local.set({replies}, loadReplies);
		replyForm.reset();
		quill.root.innerHTML = ""; // Clear editor
	});
});

replyContainer.addEventListener("click", (e) => {
	const index = e.target.dataset.index;
	if ( !index) return;

	chrome.storage.local.get(["replies"], (result) => {
		const replies = result.replies || [];

		if (e.target.classList.contains("delete")) {
			replies.splice(index, 1);
			chrome.storage.local.set({replies}, loadReplies);
		}

		if (e.target.classList.contains("insert")) {
			const reply = replies[index];
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				chrome.scripting.executeScript({
					target: {tabId: tabs[0].id},
					func: insertReplyAtCursor,
					args: [reply.content]
				});
			});
		}

		if (e.target.classList.contains("edit")) {
			const reply = replies[index];
			document.getElementById("title").value = reply.title;
			quill.root.innerHTML = reply.content; // Load HTML back into editor
			document.getElementById("tag").value = reply.tag || "";
			document.getElementById("category").value = reply.category || "";
			replies.splice(index, 1);
			chrome.storage.local.set({replies}, loadReplies);
		}
	});
});

filterTag.addEventListener("input", loadReplies);
filterCategory.addEventListener("change", loadReplies);

function insertReplyAtCursor(html) {
	const activeElement = document.activeElement;
	if (activeElement && (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT")) {
		// Insert plain text version if input/textarea
		const text = html.replace(/<[^>]+>/g, "");
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
		activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
		activeElement.focus();
	} else if (activeElement && activeElement.isContentEditable) {
		// Insert HTML if contentEditable
		document.execCommand("insertHTML", false, html);
	}
}

loadReplies();