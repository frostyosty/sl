// Logs when content script is running
console.log('Blurt content script loaded');

// Ensure script doesn't run on restricted URLs
if (!window.location.href.startsWith('chrome://') && !window.location.href.includes('chrome.google.com/webstore')) {

  // Helper function to load comments for a given root URL
  function loadCommentsForURL(url) {
    const rootUrl = new URL(url).origin;
    const storedComments = localStorage.getItem(rootUrl);
    return storedComments ? JSON.parse(storedComments) : [];
  }

  // Helper function to save comments
  function saveComment(url, comment) {
    const rootUrl = new URL(url).origin;
    const existingComments = loadCommentsForURL(rootUrl);
    existingComments.push(comment);
    localStorage.setItem(rootUrl, JSON.stringify(existingComments));
  }

  // Check if the layout is saved as overlay or body
  function getLayoutPreference() {
    return localStorage.getItem('blurtLayout') || 'overlay';
  }

  // Save user preference for layout
  function setLayoutPreference(layout) {
    localStorage.setItem('blurtLayout', layout);
  }

  // Inject comment box HTML
  function addCommentSection() {
    const commentSectionHTML = `
      <div id="blurt-comment-section" style="display: flex; flex-direction: column;">
        <h3>Add a Comment</h3>
        <textarea id="blurt-comment-input" style="width: 100%; height: 50px;"></textarea>
        <button id="blurt-submit-button">Submit</button>
        <div id="blurt-previous-comments"></div>
        <button id="blurt-toggle-layout">Move to Page</button>
        <button id="blurt-toggle-button">Hide</button>
      </div>
    `;

    const commentSectionElement = document.createElement('div');
    commentSectionElement.innerHTML = commentSectionHTML;
    document.body.appendChild(commentSectionElement);

    // Load existing comments
    let currentURL = window.location.href;
    let currentComments = loadCommentsForURL(currentURL);
    const previousComments = document.getElementById('blurt-previous-comments');
    currentComments.forEach(comment => {
      let commentElement = document.createElement('p');
      commentElement.textContent = comment;
      previousComments.appendChild(commentElement);
    });

    // Submit comment handler
    document.getElementById('blurt-submit-button').addEventListener('click', function() {
      const commentText = document.getElementById('blurt-comment-input').value;
      if (commentText.trim() !== '') {
        saveComment(currentURL, commentText);
        let newCommentElement = document.createElement('p');
        newCommentElement.textContent = commentText;
        previousComments.appendChild(newCommentElement);
        document.getElementById('blurt-comment-input').value = '';
      }
    });

    // Toggle visibility
    document.getElementById('blurt-toggle-button').addEventListener('click', toggleCommentSection);

    // Toggle layout between overlay and appended to body
    document.getElementById('blurt-toggle-layout').addEventListener('click', toggleLayout);

    // Apply the saved layout (overlay or body)
    applyLayout();
  }

  // Apply layout based on saved preference
  function applyLayout() {
    const layout = getLayoutPreference();
    const commentSection = document.getElementById('blurt-comment-section');
    const toggleLayoutButton = document.getElementById('blurt-toggle-layout');

    if (layout === 'overlay') {
      commentSection.style.position = 'fixed';
      commentSection.style.top = '10px';
      commentSection.style.right = '10px';
      commentSection.style.width = '300px';
      toggleLayoutButton.textContent = 'Move to Page';
    } else {
      commentSection.style.position = 'relative';
      document.body.insertBefore(commentSection, document.body.firstChild); // Move to body start
      toggleLayoutButton.textContent = 'Move to Overlay';
    }
  }

  // Toggle layout between overlay and page
  function toggleLayout() {
    const currentLayout = getLayoutPreference();
    if (currentLayout === 'overlay') {
      setLayoutPreference('body');
    } else {
      setLayoutPreference('overlay');
    }
    applyLayout();
  }

  // Toggle comment section visibility
  let commentSectionVisible = true;
  function toggleCommentSection() {
    const commentSection = document.getElementById('blurt-comment-section');
    if (commentSectionVisible) {
      commentSection.style.display = 'none';
    } else {
      commentSection.style.display = 'flex';
    }
    commentSectionVisible = !commentSectionVisible;
  }

  // Automatically add the comment section when the script loads
  addCommentSection();
}
