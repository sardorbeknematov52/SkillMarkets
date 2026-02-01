// ============================================
// SkillMarket - Общий JavaScript для приложения
// ============================================

// ===== 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====


function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}


function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}


function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}


function isValidPassword(password) {
    return password.length >= 6;
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== 2. ВАЛИДАЦИЯ ФОРМ =====


function validateRegisterForm(form) {
    const username = form.querySelector('input[name="username"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;
    const role = form.querySelector('input[name="role"]:checked');

    let errors = [];

    if (username.length < 3) {
        errors.push('Имя пользователя должно содержать минимум 3 символа');
    }

    if (!isValidEmail(email)) {
        errors.push('Неверный формат email');
    }

    if (!isValidPassword(password)) {
        errors.push('Пароль должен содержать минимум 6 символов');
    }

    if (!role) {
        errors.push('Выберите роль: студент или репетитор');
    }

    return errors;
}


function validateLoginForm(form) {
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;

    let errors = [];

    if (!isValidEmail(email)) {
        errors.push('Неверный формат email');
    }

    if (password.length === 0) {
        errors.push('Введите пароль');
    }

    return errors;
}


function validateBookingForm(form) {
    const bookingDate = form.querySelector('input[name="booking_date"]').value;
    const bookingTime = form.querySelector('input[name="booking_time"]').value;

    let errors = [];

    if (!bookingDate) {
        errors.push('Выберите дату занятия');
    }

    if (!bookingTime) {
        errors.push('Выберите время занятия');
    }

   
    const selectedDate = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        errors.push('Нельзя забронировать занятие на прошедшую дату');
    }

    return errors;
}

// ===== 3. УВЕДОМЛЕНИЯ И ТОСТАСТЫ =====


function showToast(message, type = 'info') {
    
    const existingToast = document.getElementById('skillmarket-toast');
    if (existingToast) {
        existingToast.remove();
    }

    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Создаем тост
    const toast = document.createElement('div');
    toast.id = 'skillmarket-toast';
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.role = 'alert';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    toast.style.cssText = `
        margin-bottom: 10px;
        animation: slideInRight 0.3s ease-out;
    `;

    toastContainer.appendChild(toast);

    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('fade');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}


function showConfirmDialog(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// ===== 4. АНИМАЦИИ И ЭФФЕКТЫ =====


function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';

    let opacity = 0;
    const interval = setInterval(() => {
        opacity += 0.1;
        element.style.opacity = opacity;
        if (opacity >= 1) {
            clearInterval(interval);
        }
    }, duration / 10);
}


function fadeOut(element, duration = 300) {
    let opacity = 1;
    const interval = setInterval(() => {
        opacity -= 0.1;
        element.style.opacity = opacity;
        if (opacity <= 0) {
            element.style.display = 'none';
            clearInterval(interval);
        }
    }, duration / 10);
}


function smoothScrollTo(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// ===== 5. РАБОТА С ФОРМАМИ =====

// Очистка формы
function clearForm(form) {
    form.reset();
    
    const errorElements = form.querySelectorAll('.invalid-feedback');
    errorElements.forEach(el => el.remove());
}


function showValidationErrors(form, errors) {
    
    const oldErrors = form.querySelectorAll('.invalid-feedback');
    oldErrors.forEach(el => el.remove());

 
    errors.forEach(error => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-2';
        errorDiv.textContent = error;
        form.insertBefore(errorDiv, form.firstChild);
    });

    
    if (errors.length > 0) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ===== 6. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('SkillMarket JavaScript загружен');

    // ===== АВТОМАТИЧЕСКАЯ ВАЛИДАЦИЯ ФОРМ =====
    
    // Валидация формы регистрации
    const registerForm = document.querySelector('form[action*="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const errors = validateRegisterForm(this);
            if (errors.length > 0) {
                e.preventDefault();
                showValidationErrors(this, errors);
                showToast('Исправьте ошибки в форме', 'warning');
            }
        });
    }

    // Валидация формы логина
    const loginForm = document.querySelector('form[action*="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const errors = validateLoginForm(this);
            if (errors.length > 0) {
                e.preventDefault();
                showValidationErrors(this, errors);
                showToast('Исправьте ошибки в форме', 'warning');
            }
        });
    }

    // Валидация формы бронирования
    const bookingForm = document.querySelector('form[action*="/book/"]');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            const errors = validateBookingForm(this);
            if (errors.length > 0) {
                e.preventDefault();
                showValidationErrors(this, errors);
                showToast('Исправьте ошибки в форме', 'warning');
            }
        });
    }

    // ===== КНОПКИ ПОДТВЕРЖДЕНИЯ =====
    
  
    const cancelButtons = document.querySelectorAll('a[href*="/cancel"]');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('Вы уверены, что хотите отменить бронирование?')) {
                e.preventDefault();
            }
        });
    });

    // ===== АВТОМАТИЧЕСКАЯ ПРОКРУТКА К ОШИБКАМ =====
    
    
    const errorAlerts = document.querySelectorAll('.alert-danger, .alert-error');
    if (errorAlerts.length > 0) {
        setTimeout(() => {
            errorAlerts[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    // ===== АНИМАЦИИ ПРИ ПОЯВЛЕНИИ ЭЛЕМЕНТОВ =====
    
    
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });

    // ===== ОБРАБОТКА КЛИКОВ ПО УВЕДОМЛЕНИЯМ =====
    
   
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        alert.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-close') || e.target.tagName === 'BUTTON') {
                this.remove();
            }
        });
    });

    // ===== АДАПТИВНЫЕ ФУНКЦИИ =====
    
    // Проверка мобильного устройства
    function isMobile() {
        return window.innerWidth <= 768;
    }

    
    if (isMobile()) {
        console.log('Мобильное устройство обнаружено');
        
    }

    // ===== МОНИТОРИНГ ИЗМЕНЕНИЙ РАЗМЕРА ОКНА =====
    
    window.addEventListener('resize', function() {
        
        if (isMobile()) {
            
        } else {
            
        }
    });
});

// ===== 7. ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ =====


function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Скопировано в буфер обмена!', 'success');
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        showToast('Не удалось скопировать', 'error');
    });
}


function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}


function formatRating(rating) {
    return rating.toFixed(1);
}


function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== 8. СОХРАНЕНИЕ СОСТОЯНИЯ =====


function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Ошибка сохранения в localStorage:', e);
        return false;
    }
}


function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Ошибка загрузки из localStorage:', e);
        return defaultValue;
    }
}


function removeFromLocalStorage(key) {
    localStorage.removeItem(key);
}


function clearLocalStorage() {
    localStorage.clear();
}

// ===== 9. ОТЛАДКА =====


function debugLog(message, data = null) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('[DEBUG]', message, data ? data : '');
    }
}

// ===== 10. ЭКСПОРТ ФУНКЦИЙ  =====


window.SkillMarket = window.SkillMarket || {
    formatDate: formatDate,
    formatTime: formatTime,
    formatDateTime: formatDateTime,
    truncateText: truncateText,
    isValidEmail: isValidEmail,
    isValidPassword: isValidPassword,
    escapeHtml: escapeHtml,
    showToast: showToast,
    showConfirmDialog: showConfirmDialog,
    fadeIn: fadeIn,
    fadeOut: fadeOut,
    smoothScrollTo: smoothScrollTo,
    copyToClipboard: copyToClipboard,
    formatPrice: formatPrice,
    formatRating: formatRating,
    generateUniqueId: generateUniqueId,
    saveToLocalStorage: saveToLocalStorage,
    loadFromLocalStorage: loadFromLocalStorage,
    removeFromLocalStorage: removeFromLocalStorage,
    debugLog: debugLog
};

console.log('SkillMarket JavaScript инициализирован. Доступные функции: window.SkillMarket');