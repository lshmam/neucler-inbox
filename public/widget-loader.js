// public/widget-loader.js

(function () {
  // 1. Get Config from the script tag itself
  const scriptTag = document.getElementById('Neucler-widget-script');
  const merchantId = scriptTag.getAttribute('data-merchant-id');
  const primaryColor = scriptTag.getAttribute('data-color') || '#000000';

  if (!merchantId) return console.error("Neucler: Missing merchant-id");

  // 2. CSS Styles for the Bubble
  const style = document.createElement('style');
  style.innerHTML = `
    .vi-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${primaryColor};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
    }
    .vi-bubble:hover { transform: scale(1.05); }
    .vi-frame {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 350px;
      height: 500px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px);
      transition: all 0.3s ease;
    }
    .vi-frame.open {
      opacity: 1;
      pointer-events: all;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // 3. Create Elements
  const iframe = document.createElement('iframe');
  // CHANGE THIS TO YOUR PRODUCTION DOMAIN
  iframe.src = `https://2c859a4a21c8.ngrok-free.app/embed/${merchantId}`;
  iframe.className = 'vi-frame';

  const btn = document.createElement('div');
  btn.className = 'vi-bubble';
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

  document.body.appendChild(iframe);
  document.body.appendChild(btn);

  // 4. Toggle Logic
  let isOpen = false;
  btn.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.classList.add('open');
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else {
      iframe.classList.remove('open');
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    }
  };

})();