import ChatAPI from "./api/ChatAPI.js";

export default class Chat {
  constructor(container) {
    this.container = container;
    this.api = new ChatAPI();
    this.websocket = null;
    this.user = null;
    this.users = [];
  }

  init() {
    console.log('Инициализация чата начата...');
    try {
      this.bindToDOM();
      console.log('DOM успешно привязан');
      console.log('Инициализация чата завершена');
    } catch (error) {
      console.error('Ошибка при инициализации чата:', error);
    }
  }

  bindToDOM() {
    console.log('Привязка к DOM...');
    
this.container.innerHTML = `
      <div class="modal__form">
        <div class="modal__background"></div>
        <div class="modal__content">
          <div class="modal__header">
            <div class="modal-logo">💬</div>
            <h2>Добро пожаловать в чат</h2>
            <p>Введите ваш никнейм, чтобы начать общение</p>
          </div>
          <div class="modal__body">
            <div class="modal__form-container">
              <form class="form" id="nickname-form">
                <div class="form__group">
                  <input class="form__input" type="text" id="nickname" placeholder="Введите ваше имя" required>
                </div>
                <div class="form__hint hidden" id="error-message"></div>
              </form>
            </div>
          </div>
          <div class="modal__footer">
            <button class="modal__ok" id="enter-chat">Войти в чат</button>
          </div>
        </div>
      </div>
      <div class="chat hidden">
        <div class="chat__header">
          💬 Чат
        </div>
        <div class="chat__container">
          <div class="chat__area">
            <div class="chat__messages-container" id="messages">
              <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-text">Нет сообщений. Начните общение первым!</div>
              </div>
            </div>
            <div class="chat__messages-input">
              <form class="form" id="message-form">
                <input class="form__input" type="text" id="message-input" placeholder="Напишите сообщение..." required>
                <button type="submit" class="send-btn" id="send-btn" title="Отправить сообщение">
                  <span>➤</span>
                </button>
              </form>
            </div>
          </div>
          <div class="chat__userlist">
            <h3>Участники</h3>
            <div class="chat__users" id="users-list">
              <div class="empty-state">
                <div class="empty-state-text">Пока нет участников</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.nicknameModal = this.container.querySelector('.modal__form');
    this.nicknameForm = this.container.querySelector('#nickname-form');
    this.nicknameInput = this.container.querySelector('#nickname');
    this.errorMessage = this.container.querySelector('#error-message');
    this.enterButton = this.container.querySelector('#enter-chat');
    
    this.chatContainer = this.container.querySelector('.chat');
    this.messagesContainer = this.container.querySelector('#messages');
    this.messageForm = this.container.querySelector('#message-form');
    this.messageInput = this.container.querySelector('#message-input');
    this.sendButton = this.container.querySelector('#send-btn');
    this.usersList = this.container.querySelector('#users-list');
    
    console.log('Полная HTML структура вставлена');
    this.registerEvents();
    console.log('События зарегистрированы после вставки DOM');
  }

  registerEvents() {
    console.log('Регистрация событий...');
    
    // Проверяем существование элементов перед добавлением слушателей
    if (this.enterButton) {
      this.enterButton.addEventListener('click', (e) => this.onEnterChatHandler(e));
      console.log('Слушатель кнопки входа добавлен');
    }
    
    if (this.messageForm) {
      this.messageForm.addEventListener('submit', (e) => this.sendMessage(e));
      console.log('Слушатель формы сообщения добавлен');
    }
    
    if (this.sendButton) {
      this.sendButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.sendMessage(e);
      });
      console.log('Слушатель кнопки отправки добавлен');
    }
    
    // Всегда добавляем слушатель окна
    window.addEventListener('beforeunload', () => this.disconnect());
    console.log('Слушатель окна добавлен');
  }

  subscribeOnEvents() {
    if (!this.websocket) return;

    this.websocket.onopen = () => {
      console.log('WebSocket соединение установлено');
      this.showConnectionStatus(true);
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (Array.isArray(data)) {
          this.users = data;
          this.renderUsers();
        } else {
          this.renderMessage(data);
        }
      } catch (error) {
        console.error('Ошибка при разборе сообщения WebSocket:', error);
      }
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket соединение закрыто', event.code, event.reason);
      this.showConnectionStatus(false);
      
      // Попытка переподключения через 3 секунды
      if (!event.wasClean && this.user) {
        setTimeout(() => {
          console.log('Попытка переподключения...');
          this.connect();
        }, 3000);
      }
    };

    this.websocket.onerror = (error) => {
      console.error('Ошибка WebSocket:', error);
      this.showConnectionStatus(false);
    };
  }

  async onEnterChatHandler(e) {
    e.preventDefault();
    
    const nickname = this.nicknameInput.value.trim();
    
    if (!nickname) {
      this.showError('Введите имя');
      return;
    }

    try {
      const response = await this.api.createUser(nickname);
      
      if (response.status === 'ok') {
        this.user = response.user;
        this.nicknameModal.classList.add('hidden');
        this.chatContainer.classList.remove('hidden');
        this.showConnectionStatus(false);
        this.connect();
      }
    } catch (error) {
      this.showError(error.message || 'Произошла ошибка');
    }
  }

  connect() {
    const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:3000';
    this.websocket = new WebSocket(wsUrl);
    this.subscribeOnEvents();
  }

  disconnect() {
    if (this.websocket && this.user) {
      const exitMessage = {
        type: 'exit',
        user: this.user,
      };
      this.websocket.send(JSON.stringify(exitMessage));
      this.websocket.close();
    }
  }

  sendMessage(e) {
    e.preventDefault();
    
    const messageText = this.messageInput.value.trim();
    
    if (!messageText || !this.websocket) return;

    const message = {
      type: 'send',
      message: messageText,
      user: this.user,
    };

    this.websocket.send(JSON.stringify(message));
    this.messageInput.value = '';
  }

  renderMessage(data) {
    const emptyState = this.messagesContainer.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    const messageElement = document.createElement('div');
    
    const isOwnMessage = data.user.id === this.user?.id;
    const containerClass = isOwnMessage ? 'message__container-yourself' : 'message__container-interlocutor';
    const userName = isOwnMessage ? 'Вы' : data.user.name;
    const userInitial = userName.charAt(0).toUpperCase();
    
    messageElement.className = `message__container ${containerClass}`;
    
    if (isOwnMessage) {
      messageElement.innerHTML = `
        <div class="message__content">
          <div class="message__header">${userName}</div>
          <div class="message__bubble">${data.message}</div>
        </div>
      `;
    } else {
      messageElement.innerHTML = `
        <div class="message__avatar">${userInitial}</div>
        <div class="message__content">
          <div class="message__header">${userName}</div>
          <div class="message__bubble">${data.message}</div>
        </div>
      `;
    }
    
    this.messagesContainer.append(messageElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  renderUsers() {
    this.usersList.innerHTML = '';
    
    if (this.users.length === 0) {
      this.usersList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">Пока нет участников</div>
        </div>
      `;
      return;
    }
    
    this.users.forEach((user) => {
      const userElement = document.createElement('div');
      const isCurrentUser = user.id === this.user?.id;
      userElement.className = `chat__user ${isCurrentUser ? 'current-user' : ''}`;
      
      // Добавляем аватар с первой буквой имени
      const userInitial = user.name.charAt(0).toUpperCase();
      userElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            background: ${isCurrentUser ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: ${isCurrentUser ? 'white' : 'white'}; 
            font-size: 12px; 
            font-weight: 600;
            flex-shrink: 0;
          ">${userInitial}</div>
          <span>${user.name}</span>
          ${isCurrentUser ? '<span style="margin-left: auto; font-size: 12px;">Вы</span>' : ''}
        </div>
      `;
      
      this.usersList.append(userElement);
    });
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.remove('hidden');
    
    setTimeout(() => {
      this.errorMessage.classList.add('hidden');
    }, 3000);
  }
  
  // Cтатус подключения
  showConnectionStatus(connected) {
    if (!this.statusElement) {
      this.statusElement = document.querySelector('.connection-status');
      
      if (!this.statusElement) {
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'connection-status';
        const header = document.querySelector('.chat__header');
        if (header) {
          header.append(this.statusElement);
        }
      }
    }
    
    if (!this.statusElement) return;
    
    if (connected) {
      this.statusElement.innerHTML = '🟢 Подключено';
      this.statusElement.classList.remove('disconnected');
      this.statusElement.classList.add('connected');
    } else {
      this.statusElement.innerHTML = '🔴 Соединение потеряно...';
      this.statusElement.classList.remove('connected');
      this.statusElement.classList.add('disconnected');
    }
  }
}
