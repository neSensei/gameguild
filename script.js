const quill = new Quill('#editor', {
    modules: {
        toolbar: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'video', 'code-block'],
        ],
    },
    placeholder: 'Твори прекрасное...',
    theme: 'snow',
});

let users = [
    { username: 'admin', password: '1234', role: 'admin' }
];
const adminUser = {
    username: 'admin',
    password: '1234',
    role: 'admin',
    email: 'admin@example.com',
    registrationDate: '2023-01-01',
    avatar: '', // Путь к аватарке
};

// Сохранение текущего пользователя
let currentUser = null;
let articles = [];
let mainArticleIndex = localStorage.getItem('mainArticleIndex') || 0; // Индекс выбранной основной статьи
let externalNews = []; // для хранения RSS-новостей

// Функция для загрузки статей
function loadArticles(filteredCategory = 'все') {
    const allArticlesContentDiv = document.getElementById('all-articles-content');
    const newsContentDiv = document.getElementById('news-content').innerHTML = '';;
    const reviewsContentDiv = document.getElementById('reviews-content');
    const guidesContentDiv = document.getElementById('guides-content');
    const existingArticlesDiv = document.getElementById('existing-articles');
    const mainArticleSelector = document.getElementById('main-article-selector');

    allArticlesContentDiv.innerHTML = '';  // Очистка перед загрузкой
    newsContentDiv.innerHTML = '';
    reviewsContentDiv.innerHTML = '';
    guidesContentDiv.innerHTML = '';
    existingArticlesDiv.innerHTML = '';
    mainArticleSelector.innerHTML = '<option disabled selected>Выберите статью</option>'; // Обновляем селектор

    // Имитация загрузки статей из localStorage
    const storedArticles = JSON.parse(localStorage.getItem('articles')) || [];
    articles = storedArticles;

    // Сортировка статей по дате публикации (по убыванию)
    articles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    articles.forEach((article, index) => {
        const imgElement = `<img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" onerror="this.src='image/icons/Noimage.jpg';" style="max-width: 100%; border-radius: 5px;">`;

        // Заполняем селектор для назначения главной статьи
        mainArticleSelector.innerHTML += `<option value="${index}">${article.title}</option>`;

        // Заполняем секции "Все статьи" и категорий
        if (filteredCategory === 'все' || article.category === filteredCategory) {
            allArticlesContentDiv.innerHTML += `
                <div class="article-block" onclick="openFullArticle(${index})">
                    <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" onerror="this.src='image/icons/Noimage.jpg';" />
                    <div class="article-title">${article.title}</div>
                </div>`;
        }
                if (article.category === 'новости') {
            newsContentDiv.innerHTML += `
                <div class="article-block internal-news-block" onclick="openFullArticle(${index})">
                    <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" 
                        alt="${article.title}" 
                        onerror="this.src='image/icons/Noimage.jpg';" />
                    <div class="article-title">${article.title}</div>
                    <small>${new Date(article.publishDate).toLocaleDateString('ru-RU')}</small>
                </div>
            `;
        } else if (article.category === 'обзоры') {
            reviewsContentDiv.innerHTML += `
                <div class="article-block" onclick="openFullArticle(${index})">
                    <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" onerror="this.src='image/icons/Noimage.jpg';" />
                    <div class="article-title">${article.title}</div>
                </div>`;
        } else if (article.category === 'гайды') {
            guidesContentDiv.innerHTML += `
                <div class="article-block" onclick="openFullArticle(${index})">
                    <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" onerror="this.src='image/icons/Noimage.jpg';" />
                    <div class="article-title">${article.title}</div>
                </div>`;
        }

        existingArticlesDiv.innerHTML += `
            <div class="existing-article">
                <h4>${article.title}</h4>
                <button onclick='editArticle(${index})'>Редактировать</button>
                <button onclick='deleteArticle(${index})'>Удалить</button>
            </div>`;
    });
}

// Функция для загрузки недавних статей
// Функция для загрузки недавних статей
function loadRecentArticles() {
    const recentArticlesSliderContent = document.getElementById('recent-articles-slider-content');
    recentArticlesSliderContent.innerHTML = ''; // Очистить содержимое слайдера

    // Получаем последние статьи (например, 6)
    const recentArticles = articles.slice(0, 6); // Получаем первые 6 статей

    // Сортируем последние статьи по дате публикации (по убыванию)
    recentArticles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    recentArticles.forEach((article, index) => {
        const articleBlock = document.createElement('div');
        articleBlock.className = 'recent-article-block';
        articleBlock.innerHTML = `
            <a onclick="openFullArticle(${index}); return false;" style="text-decoration: none; color: inherit;">
                <div class="article-image-container">
                    <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" class="article-image" onerror="this.src='image/icons/Noimage.jpg';">
                    <div class="recent-article-title">${article.title}</div>
                </div>
            </a>
        `;
        recentArticlesSliderContent.appendChild(articleBlock);
    });

    updateSliderPosition(); // Обновляем позицию слайдера в начале
}

// === ВНЕШНИЕ НОВОСТИ ИЗ RSS ===

// Функция для отображения внешних новостей
function renderExternalNews() {
    const container = document.getElementById('external-news-container');
    if (!container) return;

    // Очищаем только внешние новости
    container.innerHTML = `
        <h3 style="color: gold; margin: 20px 0 10px;">🎮 Внешние новости (Igromania)</h3>
        <div id="external-news-grid" style="display: flex; flex-wrap: wrap; gap: 15px;"></div>
    `;

    const grid = document.getElementById('external-news-grid');

    externalNews
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, 6)
        .forEach(article => {
            const pubDate = new Date(article.pubDate).toLocaleDateString('ru-RU');
            const title = article.title.length > 70 ? article.title.slice(0, 70) + '...' : article.title;

            const articleDiv = document.createElement('div');
            articleDiv.style = `
                width: calc(33.33% - 15px);
                border: 1px solid #444;
                border-radius: 8px;
                overflow: hidden;
                background: #1e1e1e;
            `;
            articleDiv.innerHTML = `
                <a href="${article.link}" target="_blank" style="text-decoration: none; color: inherit;">
                    <img src="${article.thumbnail || 'image/icons/Noimage.jpg'}" 
                         alt="${title}" 
                         onerror="this.src='image/icons/Noimage.jpg';" 
                         style="width: 100%; height: 150px; object-fit: cover;">
                    <div style="padding: 10px;">
                        <div style="font-weight: bold; color: #fff; font-size: 0.95em;">${title}</div>
                        <small style="color: #aaa;">${pubDate}</small>
                        <p style="color: #ccc; font-size: 0.85em; margin-top: 5px;">
                            ${article.description.replace(/<[^>]*>/g, '').slice(0, 100)}...
                        </p>
                    </div>
                </a>
            `;
            grid.appendChild(articleDiv);
        });
}

// === ЗАГРУЗКА RSS ЧЕРЕЗ rss2json ===
fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.igromania.ru/rss/news.xml')
    .then(res => res.json())
    .then(data => {
        if (data.status === 'ok' && Array.isArray(data.items)) {
            externalNews = data.items
                .filter(item => item && item.title && item.link) // Валидация
                .slice(0, 10); // Ограничиваем, чтобы не грузить слишком много

            console.log(`✅ Загружено ${externalNews.length} внешних новостей`);
            renderExternalNews(); // Отображаем
        } else {
            console.error('❌ Ошибка в ответе RSS:', data);
            showExternalNewsError('Сервис новостей временно недоступен.');
        }
    })
    .catch(err => {
        console.error('❌ Ошибка сети:', err);
        showExternalNewsError('Не удалось подключиться к источнику новостей.');
    });

// Функция для отображения ошибки
function showExternalNewsError(message) {
    const newsContentDiv = document.getElementById('news-content');
    if (!newsContentDiv) return;

    const errorDiv = document.createElement('div');
    errorDiv.id = 'external-news-section';
    errorDiv.innerHTML = `
        <h3 style="color: #ffd700;">🎮 Внешние новости</h3>
        <p style="color: #ff6b6b; font-style: italic;">⚠️ ${message}</p>
    `;
    newsContentDiv.appendChild(errorDiv);
}



// Вызовите эту функцию при загрузке страницы, чтобы загрузить все статьи
document.addEventListener('DOMContentLoaded', () => {
    loadUser(); // Загружаем текущего пользователя при загрузке страницы
    loadArticles('все'); // Загружаем все статьи при инициализации
    loadRecentArticles(); // Загружаем недавние статьи при загрузке страницы
    loadMainArticle(); // Загружаем основную статью
});

// Устанавливаем основную статью
function setMainArticle() {
    const selector = document.getElementById('main-article-selector');
    mainArticleIndex = selector.value;

    // Сохраним индекс в localStorage для будущих загрузок
    localStorage.setItem('mainArticleIndex', mainArticleIndex);
    loadMainArticle();
}


// При загрузке страницы восстановить выбранную основную статью из localStorage
function loadMainArticle() {
    const storedMainArticleIndex = localStorage.getItem('mainArticleIndex');
    mainArticleIndex = storedMainArticleIndex ? parseInt(storedMainArticleIndex) : 0; // По умолчанию первая статья

    const article = articles[mainArticleIndex];
    if (article) {
        document.querySelector('.main-article-title').innerText = article.title;
        document.querySelector('.main-article-image').src = article.shortImage || 'image/icons/Noimage.jpg';
        document.querySelector('.main-article-content').innerHTML = article.content;
    }
}

let currentIndex = 0;
const articlesToShow = 3; // Количество статей, показываемых одновременно

// Оживите слайдер
function updateSliderPosition() {
    const recentArticlesSliderContent = document.getElementById('recent-articles-slider-content');
    const offset = -currentIndex * (100 / articlesToShow); // Рассчитываем смещение
    recentArticlesSliderContent.style.transform = `translateX(${offset}%)`; // Применяем смещение
}

// Функция для следующего слайда
function nextSlide() {
    const totalSlides = Math.ceil(articles.length / articlesToShow);
    currentIndex = (currentIndex + 1) % totalSlides; // Рассчитываем новый индекс
    updateSliderPosition();
}

// Функция для предыдущего слайда
function prevSlide() {
    const totalSlides = Math.ceil(articles.length / articlesToShow);
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; // Рассчитываем новый индекс
}

// Открытие полной статьи с анимацией
function openFullArticle(index) {
    const article = articles[index];
    document.getElementById('full-article-title').innerText = article.title;
    document.getElementById('full-article-content').innerHTML = article.content;

    // Показываем полную статью с анимацией
    const fullArticleSection = document.getElementById('full-article');

    // Убедитесь, что секция статьи не скрыта
    fullArticleSection.style.display = 'block';

    // Убираем видимость остальных секций для плавного перехода
    document.querySelectorAll('.container').forEach(section => {
        if (section.id !== 'full-article') { // Если это не полная статья
            section.classList.remove('visible'); // Убираем класс видимости
            setTimeout(() => {
                section.style.display = 'none'; // Скрываем элемент из view
            }, 500); // Задержка перед скрытием, чтобы анимация завершилась
        }
    });

    // Добавляем класс видимости для полной статьи
    setTimeout(() => {
        fullArticleSection.classList.add('visible'); // Добавляем класс видимости для анимации
    }, 0);
}

let currentArticleIndex = null; // Индекс текущей статьи для комментариев

// Функция для загрузки статей для обсуждения
function loadArticlesForDiscussion() {
    const articlesList = document.getElementById('articles-list');
    articlesList.innerHTML = ''; // Очистка текущего содержимого

    articles.forEach((article, index) => {
        const articleDiv = document.createElement('div');
        articleDiv.className = 'article-preview'; // Общий класс для статьи
        articleDiv.innerHTML = `
            <h4 class="article-title">${article.title}</h4> <!-- Используем класс article-title -->
            <p class="article-content">${article.content.substring(0, 100)}...</p> <!-- Сокращенное содержание -->
            <button class="add-feedback-button" onclick="showCommentForm(${index})">Комментировать</button>
            <div class="feedback-list" id="feedback-list-${index}"></div>
        `;
        articlesList.appendChild(articleDiv);
    });
}

// Функция для отображения формы комментариев
function showCommentForm(articleIndex) {
    const commentForm = document.getElementById(`comment-form-${articleIndex}`);
    commentForm.style.display = 'block'; // Показываем форму комментариев

    // Инициализация Quill для комментариев
    const quillContainer = document.getElementById(`quill-container-${articleIndex}`);
    quillContainer.innerHTML = ''; // Очистка предыдущего содержимого
    const quill = new Quill(`#quill-container-${articleIndex}`, {
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
            ],
        },
        placeholder: 'Напишите свой комментарий...',
        theme: 'snow',
    });
}

// Функция для добавления комментария
function addComment(articleIndex) {
    const quillContainer = document.getElementById(`quill-container-${articleIndex}`);
    const commentContent = quillContainer.firstChild.innerHTML; // Получаем содержимое из Quill

    if (commentContent.trim() === '') {
        alert("Пожалуйста, напишите комментарий.");
        return;
    }

    if (!feedbacks[articleIndex]) {
        feedbacks[articleIndex] = []; // Если нет отзывов для этой статьи, создаем массив
    }

    feedbacks[articleIndex].push(commentContent); // Сохраняем комментарий
    loadFeedbacksForArticle(articleIndex); // Обновляем отзывы для статьи

    // Скрыть форму после добавления комментария
    document.getElementById(`comment-form-${articleIndex}`).style.display = 'none';
    quillContainer.innerHTML = ''; // Очищаем Quill
}

// Функция для отображения отзывов на статью
function loadFeedbacksForArticle(articleIndex) {
    const feedbackList = document.getElementById(`feedback-list-${articleIndex}`);
    feedbackList.innerHTML = ''; // Очистка текущих отзывов

    const articleFeedbacks = feedbacks[articleIndex] || []; // Получаем отзывы для статьи

    if (articleFeedbacks.length === 0) {
        feedbackList.innerHTML = '<p>Нет комментариев.</p>';
    } else {
        articleFeedbacks.forEach((feedback) => {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'feedback';
            feedbackDiv.innerHTML = feedback; // Используем innerHTML для отображения форматированного текста
            feedbackList.appendChild(feedbackDiv);
        });
    }
}


// Функция для редактирования статьи
let currentEditingIndex = null;

function editArticle(index) {
    const article = articles[index];
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-category').value = article.category;
    quill.root.innerHTML = article.content;

    currentEditingIndex = index;
}

// Функция для удаления статьи
function deleteArticle(index) {
    if (confirm("Вы уверены, что хотите удалить эту статью?")) {
        articles.splice(index, 1);
        localStorage.setItem('articles', JSON.stringify(articles));
        loadArticles();
        loadRecentArticles(); // Обновить недавние статьи после удаления
        alert("Статья удалена!");
    }
}

// Добавление новой статьи
function addArticle() {
    const title = document.getElementById('article-title').value;
    const shortImageInput = document.getElementById('article-short-image');
    const content = quill.root.innerHTML;
    const category = document.getElementById('article-category').value;

    if (title && content && category) {
        let shortImage = '';
        if (shortImageInput.files.length > 0) {
            const file = shortImageInput.files[0];
            const reader = new FileReader();
            reader.onloadend = function () {
                shortImage = reader.result;
                saveArticle(title, content, category, shortImage);
            };
            reader.readAsDataURL(file);
        } else {
            saveArticle(title, content, category, shortImage);
        }
    } else {
        alert("Пожалуйста, заполните все поля.");
    }
}

// Сохранение статьи
function saveArticle(title, content, category, shortImage) {
    const publishDate = new Date().toISOString(); // Устанавливаем дату и время
    if (currentEditingIndex !== null) {
        // Изменяем существующую статью
        articles[currentEditingIndex] = { title, content, category, shortImage, publishDate };
        currentEditingIndex = null;
    } else {
        // Добавляем новую статью
        articles.push({ title, content, category, shortImage, publishDate });
    }

    localStorage.setItem('articles', JSON.stringify(articles));
    alert(`Статья "${title}" сохранена!`);
    clearArticleForm();
    loadArticles('все');
    loadRecentArticles(); // Обновить недавние статьи после добавления
}

// Очистка формы добавления статьи
function clearArticleForm() {
    document.getElementById('article-title').value = '';
    document.getElementById('article-short-image').value = '';
    quill.root.innerHTML = '';
}

function toggleProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    profileMenu.classList.toggle('hidden'); // Переключаем класс для отображения меню
}

function closeProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    profileMenu.classList.add('hidden'); // Скрыть меню
}
// Закрытие меню, когда пользователь кликает вне его
document.addEventListener('click', function (event) {
    const menu = document.getElementById('profile-menu');
    const avatar = document.getElementById('profile-avatar-header');

    if (!menu.contains(event.target) && !avatar.contains(event.target)) {
        menu.classList.add('hidden'); // Скрыть меню
    }
});


// Сохранение текущего пользователя в localStorage
function saveUser() {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// Загрузка пользователя
function loadUser() {
    const storedUser = localStorage.getItem('currentUser');
    currentUser = storedUser ? JSON.parse(storedUser) : adminUser;

    document.getElementById('profile-username').innerText = currentUser.username;
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-registration-date').innerText = currentUser.registrationDate || '';
    document.getElementById('profile-role').innerText = currentUser.role || 'user';

    document.getElementById('profile-avatar-header').src = currentUser.avatar || 'image/icons/Noimage.jpg';
    document.getElementById('profile-avatar-preview').src = currentUser.avatar || 'image/icons/Noimage.jpg';

    updateAuthButtons();
}

// Сохранение данных профиля
function saveProfile() {
    currentUser.email = document.getElementById('profile-email').value;

    // Установка аватара
    const avatarInput = document.getElementById('avatar-upload');
    if (avatarInput.files.length > 0) {
        const file = avatarInput.files[0];
        const reader = new FileReader();
        reader.onloadend = function () {
            currentUser.avatar = reader.result; // Устанавливаем аватар
            document.getElementById('profile-avatar-preview').src = currentUser.avatar; // Отображаем аватар
            saveUser(); // Сохраняем пользователя
            alert("Изменения успешно сохранены!");
        };
        reader.readAsDataURL(file);
    } else {
        saveUser(); // Сохраняем, если аватар не изменен
        alert("Изменения успешно сохранены!");
    }
}

let cropper; // Переменная для хранения экземпляра Cropper

// Обработчик для загрузки изображения
document.getElementById('avatar-upload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const cropImage = document.getElementById('crop-image');
            cropImage.src = e.target.result;
            cropImage.style.display = 'block';
            document.getElementById('crop-container').style.display = 'block';

            if (cropper) cropper.destroy();
            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 1
            });
        };
        reader.readAsDataURL(file);
    }
});


// Функция для обрезки изображения
function cropImage() {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas({ width: 100, height: 100 });
        const croppedDataURL = canvas.toDataURL('image/png');

        const preview = document.getElementById('cropped-image');
        preview.src = croppedDataURL;
        preview.style.display = 'block';
    }
}

// Функция для сохранения аватара
function cropImage() {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas({ width: 100, height: 100 });
        const croppedDataURL = canvas.toDataURL('image/png');

        const preview = document.getElementById('cropped-image');
        preview.src = croppedDataURL;
        preview.style.display = 'block';
    }
}




function updateAuthButtons() {
    const authButton = document.getElementById('auth-button');
    const profileAvatar = document.getElementById('profile-avatar-header');
    const adminLink = document.getElementById('admin-link'); // Ссылка на админку

    if (currentUser) {
        authButton.classList.add('hidden');
        profileAvatar.src = currentUser.avatar || 'image/icons/Noimage.jpg'; // Устанавливаем путь к аватару
        profileAvatar.classList.remove('hidden'); // Отображаем аватар

        // Проверяем, является ли текущий пользователь администратором
        if (currentUser.role === 'admin') {
            adminLink.classList.remove('hidden'); // Показываем ссылку на админку
        } else {
            adminLink.classList.add('hidden'); // Скрываем ссылку на админку
        }
    } else {
        authButton.classList.remove('hidden');
        profileAvatar.classList.add('hidden'); // Скрываем аватар, если пользователь гость
        adminLink.classList.add('hidden'); // Скрываем ссылку на админку
    }
}

function showSection(sectionId) {
    // Применяем анимацию скрытия
    document.querySelectorAll('.container').forEach(section => {
        if (section.id !== sectionId) { // Убедитесь, что скрываем только остальные секции
            section.classList.remove('visible'); // Убираем класс видимости
            setTimeout(() => {
                section.style.display = 'none'; // Скрываем элемент из view после завершения анимации
            }, 500); // Время должно совпадать с временем анимации в CSS
        }
    });

    // Отображаем только выбранную секцию с анимацией
    const activeSection = document.getElementById(sectionId);
    activeSection.style.display = 'block'; // Сначала показываем, чтобы анимация могла сработать
    setTimeout(() => {
        activeSection.classList.add('visible'); // Добавляем класс видимости с задержкой
    }, 0); // Немедленно добавляем класс, чтобы анимация сработала
}

// Регистрация нового пользователя
function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (users.find(user => user.username === username)) {
        alert("Пользователь с таким именем уже существует.");
        return;
    }

    users.push({ username, password, role: 'user' });
    alert("Регистрация успешна! Теперь вы можете войти.");
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Авторизация пользователя
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        currentUser = user; // Сохраняем текущего пользователя
        saveUser(); // Это вызывает ваш метод сохранения пользователя в localStorage
        alert("Успешный вход!");
        updateAuthButtons();
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        showSection('home'); // Переход на главную страницу после входа
    } else {
        alert("Неправильное имя пользователя или пароль.");
    }
}

// Выход из аккаунта
function logout() {
    currentUser = null; // Сбрасываем текущего пользователя
    localStorage.removeItem('currentUser'); // Удаляем данные пользователя из localStorage
    alert("Вы вышли из системы.");
    updateAuthButtons();
    showSection('auth'); // Переход на страницу авторизации
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadUser(); // Загружаем текущего пользователя при загрузке страницы
    loadArticles('все'); // Загружаем все статьи при инициализации
    loadRecentArticles(); // Загружаем недавние статьи при загрузке страницы
    loadArticlesForDiscussion(); // Загружаем статьи для обсуждения
});