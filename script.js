const placeholderImage = 'image/icons/Noimage.jpg';
let externalNews = [];
let userArticles = [];
let isDataLoaded = false;
let isDataLoading = false;
let currentSection = 'home';
let currentUser = null;
let mainArticleId = null;
let quill = null; // Глобальная переменная для Quill
// Глобальные переменные
let users = [
    {
        username: 'admin',
        password: 'admin',
        email: 'admin@example.com',
        registrationDate: '2023-01-01',
        avatar: 'image/icons/Noimage.jpg',
        bio: '',
        birthdate: '',
        gender: '',
        role: 'admin'
    },
    {
        username: 'user',
        password: 'user',
        email: 'user@example.com',
        registrationDate: '2023-01-01',
        avatar: 'image/icons/Noimage.jpg',
        bio: '',
        birthdate: '',
        gender: '',
        role: 'user'
    }
];
// Функция для проверки, авторизован ли пользователь
function isUserLoggedIn() {
    return currentUser !== null;
}
// Функция для сортировки статей по дате (от новых к старым)
function sortArticlesByDate(articles) {
    return articles.sort((a, b) => {
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        return dateB - dateA; // от новых к старым
    });
}
// Функция для инициализации состояния аутентификации
function initAuthState() {
    try {
        const storedUsers = localStorage.getItem('users');
        if (storedUsers) {
            users = JSON.parse(storedUsers);
        } else {
            localStorage.setItem('users', JSON.stringify(users));
        }
        const storedCurrentUser = localStorage.getItem('currentUser');
        if (storedCurrentUser) {
            currentUser = JSON.parse(storedCurrentUser);
            const userIndex = users.findIndex(u => u.username === currentUser.username);
            if (userIndex !== -1) {
                const originalUser = users[userIndex];
                currentUser.role = originalUser.role || 'user';
                currentUser.registrationDate = originalUser.registrationDate;
                currentUser.email = originalUser.email;
                currentUser.avatar = originalUser.avatar || currentUser.avatar;
            } else {
                currentUser = null;
                localStorage.removeItem('currentUser');
            }
        }
        const storedUserArticles = localStorage.getItem('userArticles');
        if (storedUserArticles) {
            userArticles = JSON.parse(storedUserArticles);
            // Сортируем статьи по дате при загрузке
            userArticles = sortArticlesByDate(userArticles);
        }
        const storedMainArticleId = localStorage.getItem('mainArticleId');
        if (storedMainArticleId) {
            mainArticleId = storedMainArticleId;
        }
        updateProfileUI();
        // Инициализируем админку после загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAdmin);
        } else {
            initAdmin();
        }
        // После инициализации обновляем UI
        if (isDataLoaded) {
            updateUIWithNewsData();
        }
    } catch (e) {
        console.error('Ошибка инициализации состояния аутентификации:', e);
        localStorage.removeItem('currentUser');
        currentUser = null;
        updateProfileUI();
    }
}
// Функция для сохранения состояния аутентификации в localStorage
function saveAuthState() {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('userArticles', JSON.stringify(userArticles));
    localStorage.setItem('mainArticleId', mainArticleId || '');
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('currentUser');
    }
}
// Функция для обрезки длинных заголовков
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
// Функция для форматирования даты
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}
// Функция для создания карточки свайпера
function createNewsCard(news) {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    newsCard.dataset.id = news.id;
    const image = document.createElement('img');
    image.src = news.imageUrl || placeholderImage;
    image.alt = news.title;
    image.onerror = () => { image.src = placeholderImage; };
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const title = document.createElement('h3');
    title.textContent = truncateText(news.title, 60);
    overlay.appendChild(title);
    newsCard.appendChild(image);
    newsCard.appendChild(overlay);
    newsCard.addEventListener('click', () => {
        showArticle(news);
    });
    return newsCard;
}
// Функция для создания главной статьи
function createMainArticle(news) {
    const mainArticle = document.createElement('div');
    mainArticle.className = 'hero-news';
    const image = document.createElement('img');
    image.src = news.imageUrl || placeholderImage;
    image.alt = news.title;
    image.onerror = function () {
        this.src = placeholderImage;
    };
    const overlay = document.createElement('div');
    overlay.className = 'hero-overlay';
    const title = document.createElement('h2');
    title.textContent = truncateText(news.title, 70);
    overlay.appendChild(title);
    mainArticle.appendChild(image);
    mainArticle.appendChild(overlay);
    mainArticle.addEventListener('click', () => {
        showArticle(news);
    });
    return mainArticle;
}
// Функция для создания элемента списка новостей
function createNewsItem(news) {
    const newsItem = document.createElement('div');
    newsItem.className = 'news-item';
    const image = document.createElement('img');
    image.src = news.imageUrl || placeholderImage;
    image.alt = news.title;
    image.onerror = function () { this.src = placeholderImage; };
    const content = document.createElement('div');
    content.className = 'news-content';
    const title = document.createElement('h3');
    title.textContent = truncateText(news.title, 60);
    content.appendChild(title);
    newsItem.appendChild(image);
    newsItem.appendChild(content);
    newsItem.addEventListener('click', () => {
        showArticle(news);
    });
    image.addEventListener('click', (e) => {
        e.stopPropagation();
        showArticle(news);
    });
    title.addEventListener('click', (e) => {
        e.stopPropagation();
        showArticle(news);
    });
    return newsItem;
}
// Функция для отображения полной статьи
function showArticle(news) {
    const activeSection = document.querySelector('.section.active-section, .main-section.active-section');
    if (!activeSection) return;
    const articleContent = activeSection.querySelector('.article-content-container');
    const articleTitle = activeSection.querySelector('h1');
    const articleImageContainer = activeSection.querySelector('[id$="-article-image-container"]');
    const articleContentBody = activeSection.querySelector('[id$="-article-content-body"]');
    const sourceLink = activeSection.querySelector('[id$="-source-link"]');
    const sourceLinkContainer = sourceLink.closest('.source-link-container');
    if (!articleContent || !articleTitle || !articleImageContainer || !articleContentBody || !sourceLink || !sourceLinkContainer) return;
    articleTitle.textContent = news.title;
    articleImageContainer.innerHTML = '';
    articleContentBody.innerHTML = '';
    // Добавляем основное изображение только в контейнер изображения, не в контент
    if (news.imageUrl && news.imageUrl !== placeholderImage) {
        const img = document.createElement('img');
        img.src = news.imageUrl;
        img.alt = news.title;
        img.onerror = () => { img.src = placeholderImage; };
        articleImageContainer.appendChild(img);
    }
    // Удаляем изображение из контента, если оно там есть
    let fullText = news.fullText || '';
    if (news.imageUrl && news.imageUrl !== placeholderImage) {
        // Удаляем изображение из контента, если оно совпадает с основным изображением
        // Убираем параметры запроса из URL для более гибкого сравнения
        const baseUrl = news.imageUrl.split('?')[0];
        const imgRegex = new RegExp(`<img[^>]*src=["']${escapeRegExp(baseUrl)}[^"']*["'][^>]*>`, 'g');
        fullText = fullText.replace(imgRegex, '');
    }
    if (fullText) {
        articleContentBody.innerHTML = fullText;
    } else if (news.description) {
        articleContentBody.innerHTML = `<p>${news.description}</p>`;
    } else {
        articleContentBody.innerHTML = '<p>Описание недоступно.</p>';
    }
    if (news.pubDate) {
        const dateEl = document.createElement('p');
        dateEl.className = 'date';
        dateEl.textContent = `Дата публикации: ${formatDate(news.pubDate)}`;
        articleContentBody.appendChild(dateEl);
    }
    // Проверяем, есть ли ссылка, и отображаем контейнер только если есть
    if (news.link) {
        sourceLink.href = news.link;
        sourceLink.target = '_blank';
        sourceLinkContainer.classList.remove('hidden');
    } else {
        sourceLinkContainer.classList.add('hidden');
    }
    const newsListContainer = activeSection.querySelector('.home-content-container, .news-list-container');
    if (newsListContainer) newsListContainer.style.display = 'none';
    articleContent.classList.remove('hidden');
    const backButton = activeSection.querySelector('.back-button');
    if (backButton) backButton.classList.remove('hidden');
    window.scrollTo(0, 0);
}
// Вспомогательная функция для экранирования специальных символов в регулярных выражениях
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Функция для кнопки "назад"
function setupBackButton() {
    document.querySelectorAll('.back-button').forEach(button => {
        button.addEventListener('click', e => {
            e.preventDefault();
            const activeSection = document.querySelector('.section.active-section, .main-section.active-section');
            const articleContent = activeSection?.querySelector('.article-content-container');
            const backButton = activeSection?.querySelector('.back-button');
            if (articleContent) articleContent.classList.add('hidden');
            if (backButton) backButton.classList.add('hidden');
            const newsListContainer = activeSection?.querySelector('.news-list-container, .home-content-container, .profile-content');
            if (newsListContainer) newsListContainer.style.display = 'block';
            window.scrollTo(0, activeSection.offsetTop - 80);
        });
    });
}
// Функция для закрытия всех статей
function closeAllFullArticles() {
    const sections = document.querySelectorAll('.section, .main-section');
    sections.forEach(section => {
        const articleContent = section.querySelector('.article-content-container:not(.hidden)');
        const backButton = section.querySelector('.back-button:not(.hidden)');
        if (articleContent || backButton) {
            const articleContainer = section.querySelector('.article-content-container');
            if (articleContainer) {
                articleContainer.classList.add('hidden');
            }
            const backBtn = section.querySelector('.back-button');
            if (backBtn) {
                backBtn.classList.add('hidden');
            }
            const newsListContainer = section.querySelector('.news-list-container, .home-content-container, .profile-content');
            if (newsListContainer) {
                newsListContainer.style.display = 'block';
            }
        }
    });
}
// Управление секциями
function setupPageNavigation() {
    const sections = document.querySelectorAll('.section, .main-section');
    const navLinks = document.querySelectorAll('.nav-link, .footer-nav-link');
    function showSectionInternal(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active-section');
            navLinks.forEach(link => {
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
            currentSection = sectionId;
            if (sectionId === 'home') {
                updateUIWithNewsData();
            } else if (sectionId === 'news') {
                updateNewsSection();
            } else if (sectionId === 'reviews') {
                updateReviewsSection();
            } else if (sectionId === 'guides') {
                updateGuidesSection();
            } else if (sectionId === 'community') {
                updateCommunitySection();
            } else if (sectionId === 'admin') {
                updateAdminSections();
            }
        } else {
            console.error(`Секция с ID "${sectionId}" не найдена в DOM`);
        }
    }
    window.showSection = function (sectionId) {
        showSectionInternal(sectionId);
    };
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            if (sectionId === 'profile' && !currentUser) {
                const loginModal = document.getElementById('login-modal');
                if (loginModal) loginModal.style.display = 'flex';
                return;
            }
            closeAllFullArticles();
            window.history.pushState(null, null, `#${sectionId}`);
            window.showSection(sectionId);
            
            // Закрываем мобильное меню после выбора пункта
            const navContainer = document.querySelector('.nav-container');
            if (navContainer) {
                navContainer.classList.remove('active');
            }
        });
    });
    window.addEventListener('hashchange', () => {
        if (!isDataLoading) {
            handleHashChange();
        }
    });
    window.addEventListener('load', () => {
        handleHashChange();
    });
}
// Обработка хеша URL
function handleHashChange() {
    let hash = window.location.hash.substring(1);
    if (hash === '' || hash === 'home') {
        window.showSection('home');
    } else {
        const validSections = ['news', 'reviews', 'guides', 'community', 'profile', 'admin'];
        if (validSections.includes(hash)) {
            if (hash === 'profile' && !currentUser) {
                const loginModal = document.getElementById('login-modal');
                if (loginModal) loginModal.style.display = 'flex';
            } else {
                window.showSection(hash);
            }
        } else {
            window.showSection('home');
        }
    }
}
// Обновление UI профиля
function updateProfileUI() {
    const profileIcon = document.querySelector('.profile-icon');
    if (!profileIcon) return;
    const existingDropdown = profileIcon.querySelector('.profile-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    profileIcon.innerHTML = '';
    const userAvatar = document.createElement('img');
    userAvatar.className = 'user-avatar';
    userAvatar.alt = 'Аватар пользователя';
    if (currentUser) {
        userAvatar.src = currentUser.avatar;
        const profileDropdown = document.createElement('div');
        profileDropdown.className = 'profile-dropdown';
        let dropdownHTML = `
            <div class="profile-dropdown-item" data-section="profile">
                <i class="fas fa-user"></i> Профиль
            </div>
        `;
        if (currentUser.role === 'admin') {
            dropdownHTML += `
                <div class="profile-dropdown-item" data-section="admin">
                    <i class="fas fa-cogs"></i> Панель администратора
                </div>
            `;
        }
        dropdownHTML += `
            <div class="profile-dropdown-item" data-section="logout">
                <i class="fas fa-sign-out-alt"></i> Выйти
            </div>
        `;
        profileDropdown.innerHTML = dropdownHTML;
        profileIcon.appendChild(userAvatar);
        profileIcon.appendChild(profileDropdown);
        userAvatar.addEventListener('click', function (e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        const dropdownItems = profileDropdown.querySelectorAll('.profile-dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                const section = this.getAttribute('data-section');
                profileDropdown.classList.remove('active');
                if (section === 'logout') {
                    if (confirm('Вы действительно хотите выйти?')) {
                        currentUser = null;
                        saveAuthState();
                        updateProfileUI();
                        alert('Вы успешно вышли из системы');
                    }
                } else if (section === 'admin' && currentUser.role === 'admin') {
                    window.history.pushState(null, null, '#admin');
                    window.showSection('admin');
                } else {
                    window.history.pushState(null, null, `#${section}`);
                    window.showSection(section);
                }
            });
        });
    } else {
        userAvatar.src = 'image/icons/ProfileCircle (1).svg';
        profileIcon.appendChild(userAvatar);
        userAvatar.addEventListener('click', function (e) {
            e.stopPropagation();
            const loginModal = document.getElementById('login-modal');
            if (loginModal) loginModal.style.display = 'flex';
        });
    }
    document.addEventListener('click', function (e) {
        if (currentUser && profileIcon && !profileIcon.contains(e.target)) {
            const dropdown = document.querySelector('.profile-dropdown');
            if (dropdown) dropdown.classList.remove('active');
        }
    });
    const profileUsername = document.getElementById('profile-username');
    const profileBio = document.getElementById('profile-bio');
    const profileBirthdate = document.getElementById('profile-birthdate');
    const profileGender = document.getElementById('profile-gender');
    if (profileUsername && currentUser) profileUsername.value = currentUser.username;
    if (profileBio && currentUser) profileBio.value = currentUser.bio || '';
    if (profileBirthdate && currentUser) profileBirthdate.value = currentUser.birthdate || '';
    if (profileGender && currentUser) profileGender.value = currentUser.gender || '';
}
// Инициализация Quill и админки
function initAdmin() {
    const editorElement = document.getElementById('editor');
    if (editorElement && !quill) {
        quill = new Quill('#editor', {
            modules: {
                toolbar: [
                    [{ header: [1, 2, false] }],
                    ['bold', 'italic', 'underline'],
                    ['link', 'blockquote', 'image', 'code-block'],
                ],
            },
            placeholder: 'Твори прекрасное...',
            theme: 'snow',
        });
        // Обработчик для вставки изображений
        quill.getModule('toolbar').addHandler('image', imageHandler);
    }
    const saveArticleBtn = document.getElementById('save-article-btn');
    if (saveArticleBtn) {
        saveArticleBtn.addEventListener('click', function () {
            const title = document.getElementById('article-title').value;
            const category = document.getElementById('article-category').value;
            const imageFile = document.getElementById('article-image').files[0];
            // Получаем содержимое из Quill
            const fullText = quill ? quill.root.innerHTML : '<p>Нет содержания</p>';
            if (!title || !fullText) {
                alert('Заголовок и содержание статьи обязательны!');
                return;
            }
            const id = 'user-' + Date.now();
            const newArticle = {
                id: id,
                title: title,
                category: category,
                fullText: fullText,
                description: truncateText(fullText.replace(/<[^>]*>/g, ''), 200),
                pubDate: new Date().toISOString()
            };
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    newArticle.imageUrl = e.target.result;
                    saveArticle(newArticle);
                };
                reader.readAsDataURL(imageFile);
            } else {
                newArticle.imageUrl = placeholderImage;
                saveArticle(newArticle);
            }
        });
    }
    // Обработчик для предпросмотра изображения
    const articleImage = document.getElementById('article-image');
    const imagePreview = document.getElementById('image-preview');
    if (articleImage && imagePreview) {
        articleImage.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    // Обновление админских разделов, если данные уже загружены
    if (isDataLoaded) {
        updateAdminSections();
    }
}
// Обработчик для вставки изображений
function imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const range = quill.getSelection();
            quill.insertEmbed(range.index, 'image', e.target.result);
            quill.setSelection(range.index + 1, Quill.sources.USER);
        };
        reader.readAsDataURL(file);
    };
}
// Сохранение статьи
function saveArticle(article) {
    userArticles.push(article);
    // Сортируем статьи по дате
    userArticles = sortArticlesByDate(userArticles);
    saveAuthState();
    // Очистка формы
    document.getElementById('article-title').value = '';
    document.getElementById('article-category').value = 'news';
    document.getElementById('article-image').value = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('image-preview').style.display = 'none';
    // Очистка редактора Quill
    if (quill) {
        quill.setText('');
    }
    updateUIWithNewsData();
    updateAdminSections();
    alert('Статья успешно добавлена!');
}
// Обновление админских разделов
function updateAdminSections() {
    const mainArticleSelector = document.getElementById('main-article-selector');
    if (mainArticleSelector) {
        mainArticleSelector.innerHTML = '';
        const allArticles = sortArticlesByDate([...externalNews, ...userArticles]);
        if (allArticles.length > 0) {
            allArticles.forEach(article => {
                const articleCard = createAdminArticleCard(article, 'main');
                mainArticleSelector.appendChild(articleCard);
            });
        } else {
            mainArticleSelector.innerHTML = '<div class="loading">Нет доступных статей</div>';
        }
    }
    const articlesManagement = document.getElementById('articles-management');
    if (articlesManagement) {
        articlesManagement.innerHTML = '';
        const allArticles = sortArticlesByDate([...externalNews, ...userArticles]);
        if (allArticles.length > 0) {
            allArticles.forEach(article => {
                const articleCard = createAdminArticleCard(article, 'manage');
                articlesManagement.appendChild(articleCard);
            });
        } else {
            articlesManagement.innerHTML = '<div class="loading">Нет доступных статей</div>';
        }
    }
}
// Создание карточки статьи в админке
function createAdminArticleCard(article, type) {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.dataset.id = article.id;
    const img = document.createElement('img');
    img.src = article.imageUrl || placeholderImage;
    img.alt = article.title;
    img.onerror = () => { img.src = placeholderImage; };
    const content = document.createElement('div');
    content.className = 'article-card-content';
    const title = document.createElement('h4');
    title.textContent = truncateText(article.title, 50);
    const actions = document.createElement('div');
    actions.className = 'actions';
    if (type === 'main') {
        const setMainBtn = document.createElement('button');
        setMainBtn.className = 'set-main';
        setMainBtn.textContent = 'Сделать главной';
        if (mainArticleId === article.id) {
            setMainBtn.classList.add('hidden');
            setMainBtn.textContent = 'Главное (текущее)';
        }
        setMainBtn.addEventListener('click', () => {
            mainArticleId = article.id;
            localStorage.setItem('mainArticleId', mainArticleId);
            updateAdminSections();
            updateUIWithNewsData(); // Обновляем UI на главной странице
            alert('Статья назначена главной!');
        });
        actions.appendChild(setMainBtn);
    } else if (type === 'manage') {
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Редактировать';
        editBtn.addEventListener('click', () => {
            document.getElementById('article-title').value = article.title;
            document.getElementById('article-category').value = article.category || 'news';
            // Устанавливаем содержимое в Quill
            if (quill) {
                quill.clipboard.dangerouslyPasteHTML(article.fullText || '');
            }
            if (article.imageUrl && article.imageUrl !== placeholderImage) {
                const imagePreview = document.getElementById('image-preview');
                imagePreview.innerHTML = `<img src="${article.imageUrl}" alt="Preview">`;
                imagePreview.style.display = 'block';
            }
            document.getElementById('admin').scrollIntoView({ behavior: 'smooth' });
        });
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', () => {
            if (confirm('Вы действительно хотите удалить эту статью?')) {
                const userArticleIndex = userArticles.findIndex(a => a.id === article.id);
                if (userArticleIndex !== -1) {
                    userArticles.splice(userArticleIndex, 1);
                    saveAuthState();
                    updateAdminSections();
                    updateUIWithNewsData(); // Обновляем UI на главной странице
                    alert('Статья удалена!');
                } else {
                    alert('Нельзя удалить статью из внешнего источника');
                }
            }
        });
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
    }
    content.appendChild(title);
    content.appendChild(actions);
    card.appendChild(img);
    card.appendChild(content);
    return card;
}
// Обновление UI
function updateUIWithNewsData() {
    // Объединяем и сортируем все статьи
    const allArticles = sortArticlesByDate([...externalNews, ...userArticles]);
    const mainArticleContainer = document.getElementById('main-article-container');
    if (mainArticleContainer) {
        mainArticleContainer.innerHTML = '';
        // Ищем статью с mainArticleId
        let mainArticle;
        if (mainArticleId) {
            mainArticle = allArticles.find(article => article.id === mainArticleId);
        }
        // Если не найдена или mainArticleId не установлен, берем первую статью
        if (!mainArticle) {
            mainArticle = allArticles[0];
            if (mainArticle) {
                mainArticleId = mainArticle.id;
                localStorage.setItem('mainArticleId', mainArticleId);
            }
        }
        if (mainArticle) {
            const mainArticleDiv = createMainArticle(mainArticle);
            mainArticleContainer.appendChild(mainArticleDiv);
        } else {
            mainArticleContainer.innerHTML = '<div class="error">Нет доступных статей</div>';
        }
    }
    const newsSlider = document.getElementById('recent-news-slider');
    if (newsSlider) {
        newsSlider.innerHTML = '';
        // Берем статьи со 2-й по 4-ю (3 штуки), пропуская главную
        const recentNews = allArticles.slice(1, 4);
        if (recentNews.length > 0) {
            recentNews.forEach(news => {
                newsSlider.appendChild(createNewsCard(news));
            });
        } else {
            newsSlider.innerHTML = '<div class="loading">Загрузка свайпера...</div>';
        }
    }
    const allArticlesContainer = document.getElementById('all-articles-container');
    if (allArticlesContainer) {
        allArticlesContainer.innerHTML = '';
        if (allArticles.length > 0) {
            allArticles.forEach(news => {
                allArticlesContainer.appendChild(createNewsItem(news));
            });
        } else {
            allArticlesContainer.innerHTML = '<div class="loading">Загрузка всех статей...</div>';
        }
    }
    updateNewsSection();
    updateReviewsSection();
    updateGuidesSection();
    updateCommunitySection();
}
// Обновление секций
function updateNewsSection() {
    const newsContainer = document.getElementById('news-container');
    if (newsContainer) {
        newsContainer.innerHTML = '';
        const newsItems = sortArticlesByDate([...externalNews, ...userArticles]).slice(0, 6);
        if (newsItems.length > 0) {
            newsItems.forEach(news => {
                newsContainer.appendChild(createNewsItem(news));
            });
        } else {
            newsContainer.innerHTML = '<div class="error">Нет новостей</div>';
        }
    }
}
function updateReviewsSection() {
    const reviewsContainer = document.getElementById('reviews-container');
    if (reviewsContainer) {
        reviewsContainer.innerHTML = '';
        const reviews = sortArticlesByDate([...externalNews, ...userArticles].filter(news =>
            news.title.toLowerCase().includes('обзор') ||
            news.title.toLowerCase().includes('review')
        )).slice(0, 3);
        if (reviews.length > 0) {
            reviews.forEach(review => {
                reviewsContainer.appendChild(createNewsItem(review));
            });
        } else {
            const fallbackReviews = sortArticlesByDate([...externalNews, ...userArticles]).slice(3, 6);
            if (fallbackReviews.length > 0) {
                fallbackReviews.forEach(news => {
                    reviewsContainer.appendChild(createNewsItem(news));
                });
            } else {
                reviewsContainer.innerHTML = '<div class="error">Нет обзоров</div>';
            }
        }
    }
}
function updateGuidesSection() {
    const guidesContainer = document.getElementById('guides-container');
    if (guidesContainer) {
        guidesContainer.innerHTML = '';
        const guides = sortArticlesByDate([...externalNews, ...userArticles].filter(news =>
            news.title.toLowerCase().includes('гайд') ||
            news.title.toLowerCase().includes('прохождение') ||
            news.title.toLowerCase().includes('guide')
        )).slice(0, 3);
        if (guides.length > 0) {
            guides.forEach(guide => {
                guidesContainer.appendChild(createNewsItem(guide));
            });
        } else {
            const fallbackGuides = sortArticlesByDate([...externalNews, ...userArticles]).slice(6, 9);
            if (fallbackGuides.length > 0) {
                fallbackGuides.forEach(news => {
                    guidesContainer.appendChild(createNewsItem(news));
                });
            } else {
                guidesContainer.innerHTML = '<div class="error">Нет гайдов</div>';
            }
        }
    }
}
function updateCommunitySection() {
    const communityContainer = document.getElementById('community-container');
    if (communityContainer) {
        communityContainer.innerHTML = '';
        const communityNews = sortArticlesByDate([...externalNews, ...userArticles]).slice(9, 12);
        if (communityNews.length > 0) {
            communityNews.forEach(news => {
                communityContainer.appendChild(createNewsItem(news));
            });
        } else {
            const fallbackCommunity = sortArticlesByDate([...externalNews, ...userArticles]).slice(6, 9);
            if (fallbackCommunity.length > 0) {
                fallbackCommunity.forEach(news => {
                    communityContainer.appendChild(createNewsItem(news));
                });
            } else {
                communityContainer.innerHTML = '<div class="error">Нет информации о сообществе</div>';
            }
        }
    }
}
function showErrorMessages() {
    const elements = [
        'main-article-container',
        'recent-news-slider',
        'news-container',
        'reviews-container',
        'guides-container',
        'community-container'
    ];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="error">Ошибка загрузки данных</div>';
    });
}
// Загрузка RSS
function loadRSSData() {
    if (isDataLoading) return;
    isDataLoading = true;
    document.querySelectorAll('.loading').forEach(el => {
        el.textContent = 'Загрузка данных...';
    });
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.stopgame.ru/rss_all.xml')
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data.status === 'ok' && data.items && data.items.length > 0) {
                externalNews = data.items.map(item => {
                    let description = '';
                    if (item.description) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = item.description;
                        description = tempDiv.textContent || '';
                        description = description.substring(0, 200) + '...';
                    }
                    return {
                        id: 'rss-' + (item.guid || item.link).replace(/[^a-zA-Z0-9]/g, ''),
                        title: item.title || '',
                        link: item.link || '',
                        pubDate: item.pubDate || '',
                        description: description,
                        imageUrl: item.thumbnail || item.enclosure?.url || placeholderImage
                    };
                });
                // Сортируем статьи по дате
                externalNews = sortArticlesByDate(externalNews);
                isDataLoaded = true;
                updateUIWithNewsData();
                if (currentSection === 'admin') {
                    updateAdminSections();
                }
            } else {
                externalNews = [];
                showErrorMessages();
            }
        })
        .catch(err => {
            console.error('❌ Ошибка загрузки RSS:', err);
            showErrorMessages();
        })
        .finally(() => {
            isDataLoading = false;
            if (!isDataLoading) {
                handleHashChange();
            }
        });
}
// Авторизация
function setupAuth() {
    initAuthState();
    const profileIcon = document.querySelector('.profile-icon');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (profileIcon) {
        profileIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            if (currentUser) {
                const profileDropdown = document.querySelector('.profile-dropdown');
                if (profileDropdown) {
                    profileDropdown.classList.toggle('active');
                }
            } else {
                loginModal.style.display = 'flex';
            }
        });
    }
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
        });
    });
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function (e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'flex';
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function (e) {
            e.preventDefault();
            registerModal.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const login = document.getElementById('login').value;
            const password = document.getElementById('password').value;
            const user = users.find(u => u.username === login && u.password === password);
            if (user) {
                currentUser = {
                    ...user,
                    avatar: user.avatar || placeholderImage,
                    bio: user.bio || '',
                    birthdate: user.birthdate || '',
                    gender: user.gender || ''
                };
                saveAuthState();
                loginModal.style.display = 'none';
                updateProfileUI();
                alert(`Добро пожаловать, ${currentUser.username}!`);
            } else {
                alert('Неверный логин или пароль');
            }
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Некорректный email');
                return;
            }
            if (password.length < 6) {
                alert('Пароль должен содержать не менее 6 символов');
                return;
            }
            if (users.some(u => u.username === username)) {
                alert('Имя пользователя уже занято');
                return;
            }
            const newUser = {
                username: username,
                password: password,
                email: email,
                registrationDate: new Date().toISOString().split('T')[0],
                avatar: placeholderImage,
                bio: '',
                birthdate: '',
                gender: ''
            };
            users.push(newUser);
            saveAuthState();
            registerModal.style.display = 'none';
            loginModal.style.display = 'flex';
            if (document.getElementById('login')) {
                document.getElementById('login').value = username;
            }
            alert('Регистрация успешна! Теперь вы можете войти в систему.');
        });
    }
    const changeAvatarBtn = document.querySelector('.change-avatar-btn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', function () {
            document.getElementById('avatar-upload').click();
        });
    }
    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', function (e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const avatarPreviewImg = document.querySelector('.avatar-preview img');
                    const userAvatar = document.querySelector('.user-avatar');
                    if (avatarPreviewImg) avatarPreviewImg.src = e.target.result;
                    if (userAvatar) userAvatar.src = e.target.result;
                    if (currentUser) {
                        currentUser.avatar = e.target.result;
                        saveAuthState();
                    }
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    const btnSavePassword = document.querySelector('.btn-save-password');
    if (btnSavePassword) {
        btnSavePassword.addEventListener('click', function () {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            if (currentUser && currentPassword !== currentUser.password) {
                alert('Текущий пароль введен неверно');
                return;
            }
            if (newPassword !== confirmPassword) {
                alert('Новые пароли не совпадают');
                return;
            }
            if (newPassword.length < 6) {
                alert('Пароль должен содержать не менее 6 символов');
                return;
            }
            if (currentUser) {
                currentUser.password = newPassword;
                saveAuthState();
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                alert('Пароль успешно изменен!');
            }
        });
    }
    const btnSaveProfile = document.querySelector('.btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', function () {
            const username = document.getElementById('profile-username').value;
            const bio = document.getElementById('profile-bio').value;
            const birthdate = document.getElementById('profile-birthdate').value;
            const gender = document.getElementById('profile-gender').value;
            if (username !== currentUser.username && users.some(u => u.username === username)) {
                alert('Имя пользователя уже занято');
                return;
            }
            if (currentUser) {
                currentUser.username = username;
                currentUser.bio = bio;
                currentUser.birthdate = birthdate;
                currentUser.gender = gender;
                saveAuthState();
                alert('Профиль успешно обновлен!');
            }
        });
    }
    const btnCancel = document.querySelector('.btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', function () {
            const profileUsername = document.getElementById('profile-username');
            const profileBio = document.getElementById('profile-bio');
            const profileBirthdate = document.getElementById('profile-birthdate');
            const profileGender = document.getElementById('profile-gender');
            if (profileUsername && currentUser) profileUsername.value = currentUser.username;
            if (profileBio && currentUser) profileBio.value = currentUser.bio || '';
            if (profileBirthdate && currentUser) profileBirthdate.value = currentUser.birthdate || '';
            if (profileGender && currentUser) profileGender.value = currentUser.gender || '';
        });
    }
    if (currentUser) {
        updateProfileUI();
    }
}

// Функция для инициализации мобильного меню
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navContainer = document.querySelector('.nav-container');
    
    if (hamburger && navContainer) {
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            navContainer.classList.toggle('active');
        });
        
        // Закрываем меню при клике вне его
        document.addEventListener('click', function(e) {
            if (!navContainer.contains(e.target) && !hamburger.contains(e.target)) {
                navContainer.classList.remove('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupPageNavigation();
    setupBackButton();
    setupAuth();
    loadRSSData();
    setupMobileMenu();
});