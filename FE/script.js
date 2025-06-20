const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';

  // Tampilkan indikator typing
  const typingIndicator = showTyping();

  // Kirim pesan ke backend
  fetch('http://localhost:3000/generate-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: userMessage })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      removeTyping(typingIndicator); // Hapus indikator typing
      const html = markdownToHTML(data.generatedText);
      appendMessage('bot', html, true);
    })
    .catch(error => {
      console.error('Error sending message:', error);
      removeTyping(typingIndicator);
      appendMessage('bot', 'Error: Could not get a response.');
    });
});

function appendMessage(sender, text, isHTML = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  if (isHTML) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function markdownToHTML(markdown) {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')     // bold
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')                 // italic
    .replace(/^\* (.*)/gim, '<li>$1</li>')                  // bullet list
    .replace(/\n{2,}/g, '</p><p>')                          // paragraf
    .replace(/\n/g, '<br>')                                 // line break
    .replace(/^<li>.*<\/li>$/gim, m => `<ul>${m}</ul>`);    // wrap <li> dengan <ul>
}


function showTyping() {
  const typing = document.createElement('div');
  typing.classList.add('message', 'bot');
  typing.setAttribute('id', 'typing-indicator');
  typing.textContent = 'Gemini sedang mengetik';
  chatBox.appendChild(typing);

  // Animasi titik-titik
  let dots = 0;
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    typing.textContent = 'Gemini sedang mengetik' + '.'.repeat(dots);
  }, 500);

  typing.dataset.interval = interval;
  return typing;
}

function removeTyping(typingEl) {
  clearInterval(typingEl.dataset.interval);
  typingEl.remove();
}

// TERIMAKASIH GOOGLE CODE ASSIST