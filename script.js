// === ИНИЦИАЛИЗАЦИЯ РЕДАКТОРА QUILL ===
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
// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let users = [
    {
        username: 'admin',
        password: '1234', // В реальном приложении НИКОГДА не храните пароли в открытом виде!
        role: 'admin',
        email: 'admin@example.com',
        registrationDate: '2023-01-01',
        avatar: 'image/icons/Noimage.jpg'
    }
];
let currentUser = null;
let articles = []; // ✅ Объявлено
let externalNews = []; // ✅ Объявлено
let currentEditingIndex = null;
let feedbacks = JSON.parse(localStorage.getItem('feedbacks')) || {};
// === УПРАВЛЕНИЕ RSS СТАТЬЯМИ ===
let hiddenRssArticles = JSON.parse(localStorage.getItem('hiddenRssArticles')) || [];
let mainRssArticleLink = localStorage.getItem('mainRssArticleLink') || null;
// === СОХРАНЕНИЕ И ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ ===
function saveUser() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify({
            username: currentUser.username,
            role: currentUser.role,
            avatar: currentUser.avatar || 'image/icons/Noimage.jpg',
            email: currentUser.email,
            registrationDate: currentUser.registrationDate
        }));
    }
}
function loadUser() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateProfileDisplay();
    }
    updateAuthButtons();
}

function updateProfileDisplay() {
    if (document.getElementById('profile-username')) {
        document.getElementById('profile-username').innerText = currentUser.username;
    }
    if (document.getElementById('profile-email')) {
        document.getElementById('profile-email').value = currentUser.email || '';
    }
    if (document.getElementById('profile-registration-date')) {
        document.getElementById('profile-registration-date').innerText = currentUser.registrationDate || '';
    }
    if (document.getElementById('profile-role')) {
        document.getElementById('profile-role').innerText = currentUser.role || 'user';
    }
    const avatarSrc = currentUser.avatar || 'image/icons/Noimage.jpg';
    if (document.getElementById('profile-avatar-header')) {
        document.getElementById('profile-avatar-header').src = avatarSrc;
    }
    if (document.getElementById('profile-avatar-preview')) {
        document.getElementById('profile-avatar-preview').src = avatarSrc;
    }
}

// === СТАТЬИ ===
function loadArticles(filteredCategory = 'все') {
    console.log(`Загрузка статей категории: ${filteredCategory}`);

    const allArticlesContentDiv = document.getElementById('all-articles-content');
    const newsContentDiv = document.getElementById('news-content');
    const reviewsContentDiv = document.getElementById('reviews-content');
    const guidesContentDiv = document.getElementById('guides-content');
    const existingArticlesDiv = document.getElementById('existing-articles');
    const mainArticleSelector = document.getElementById('main-article-selector');
    const homeExternalNewsGrid = document.getElementById('home-external-news-grid'); // Для главной страницы

    if (allArticlesContentDiv) allArticlesContentDiv.innerHTML = '';
    if (newsContentDiv) newsContentDiv.innerHTML = '';
    if (reviewsContentDiv) reviewsContentDiv.innerHTML = '';
    if (guidesContentDiv) guidesContentDiv.innerHTML = '';
    if (mainArticleSelector) {
        mainArticleSelector.innerHTML = '<option disabled selected>Выберите статью</option>';
    }

    const storedArticles = JSON.parse(localStorage.getItem('articles')) || [];
    articles = storedArticles;
    articles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    articles.forEach((article, index) => {
        const { title, shortImage, category, publishDate } = article;

        if (mainArticleSelector) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = title;
            // Отмечаем текущую главную статью
            if (mainArticleIndex === index) {
                option.selected = true;
            }
            mainArticleSelector.appendChild(option);
        }

        if ((filteredCategory === 'все' || article.category === filteredCategory) && allArticlesContentDiv) {
            const articleBlock = createArticleBlock(article, index);
            allArticlesContentDiv.appendChild(articleBlock);
        }

        if (category === 'новости' && newsContentDiv) {
            const articleBlock = createArticleBlock(article, index);
            newsContentDiv.appendChild(articleBlock);
        } else if (category === 'обзоры' && reviewsContentDiv) {
            const articleBlock = createArticleBlock(article, index);
            reviewsContentDiv.appendChild(articleBlock);
        } else if (category === 'гайды' && guidesContentDiv) {
            const articleBlock = createArticleBlock(article, index);
            guidesContentDiv.appendChild(articleBlock);
        }
    });

    if (existingArticlesDiv) {
        existingArticlesDiv.innerHTML = '';
        articles.forEach((article, index) => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'existing-article';
            articleDiv.innerHTML = `
                <h4>${article.title}</h4>
                <small style="color: #aaa;">(${article.category})</small>
                <div>
                    <button onclick="editArticle(${index})">Редактировать</button>
                    <button onclick="deleteArticle(${index})">Удалить</button>
                    <button onclick="setMainArticle(${index})" style="background-color: #4CAF50;">${mainArticleIndex === index ? 'Главная' : 'Сделать главной'}</button>
                </div>
            `;
            existingArticlesDiv.appendChild(articleDiv);
        });

        if (existingArticlesDiv && (filteredCategory === 'все' || filteredCategory === 'новости')) {
            externalNews
                .filter(item => item && item.title && item.link && !hiddenRssArticles.includes(item.link))
                .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
                .slice(0, 6)
                .forEach(article => {
                    const articleDiv = createRssArticleBlock(article);
                    existingArticlesDiv.appendChild(articleDiv);
                });
        }
    }

    // Всегда отображаем внешние новости на главной, если контейнер существует
    if (homeExternalNewsGrid) {
        renderHomeExternalNews();
    }

    loadRecentArticles();
    loadMaterialsAndReleases();
    loadMainArticle(); // Обновляем главную статью
}

// Вспомогательная функция для создания блока внутренней статьи
function createArticleBlock(article, index) {
    const articleBlock = document.createElement('div');
    articleBlock.className = 'article-block';
    articleBlock.onclick = () => openFullArticle(index);
    articleBlock.innerHTML = `
        <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" onerror="this.src='image/icons/Noimage.jpg';" />
        <div class="article-title">${article.title}</div>
    `;
    return articleBlock;
}

// Вспомогательная функция для создания блока RSS статьи в админке
function createRssArticleBlock(rssArticle) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'existing-article';
    const pubDate = rssArticle.pubDate ? new Date(rssArticle.pubDate).toLocaleDateString('ru-RU') : 'Дата не указана';
    const isMain = mainRssArticleLink === rssArticle.link;

    articleDiv.style = `border-left: 3px solid ${isMain ? 'green' : 'gold'};`;
    articleDiv.innerHTML = `
        <h4 style="color: ${isMain ? 'green' : 'gold'};">${rssArticle.title}</h4>
        <small style="color: #aaa;">(RSS) ${pubDate}</small>
        <div>
            ${isMain ? '<span style="color: #4CAF50; font-weight: bold;">Главная RSS</span>' : ''}
        </div>
    `;

    const openButton = document.createElement('button');
    openButton.textContent = 'Открыть';
    openButton.style.backgroundColor = '#2196F3';
    openButton.onclick = (e) => {
        e.stopPropagation();
        openFullRssArticle(rssArticle);
    };

    const hideButton = document.createElement('button');
    hideButton.textContent = 'Скрыть';
    hideButton.style.backgroundColor = '#f44336';
    hideButton.onclick = (e) => {
        e.stopPropagation();
        hideRssArticle(rssArticle.link);
    };

    const setMainButton = document.createElement('button');
    setMainButton.textContent = isMain ? 'Главная' : 'Сделать главной';
    setMainButton.style.backgroundColor = '#4CAF50';
    setMainButton.onclick = (e) => {
        e.stopPropagation();
        let imageUrlForMain = rssArticle.imageUrl || 'image/icons/Noimage.jpg';
        setMainRssArticle(rssArticle.link, rssArticle.title.replace(/'/g, "\\'"), imageUrlForMain);
    };

    const buttonDiv = articleDiv.querySelector('div');
    buttonDiv.appendChild(openButton);
    buttonDiv.appendChild(hideButton);
    buttonDiv.appendChild(setMainButton);

    return articleDiv;
}


// === ФИЛЬТРЫ НОВОСТЕЙ ===
function filterNews(platform) {
    const newsList = document.getElementById('news-content');
    if (!newsList) return;

    newsList.innerHTML = '';

    // Отображаем внутренние новости
    const internalNews = articles.filter(article => article.category === 'новости');

    // Отображаем внешние новости
    const externalNewsToShow = externalNews.filter(item =>
        item && item.title && item.link && !hiddenRssArticles.includes(item.link)
    );

    let articlesToShow = [];

    if (platform === 'все') {
        // Сначала внутренние, потом внешние
        articlesToShow = [...internalNews.map(a => ({ ...a, type: 'internal' })), ...externalNewsToShow.map(a => ({ ...a, type: 'rss' }))];
    } else {
        // Для фильтрации по платформе (упрощенная реализация)
        // Пока просто покажем сообщение и все новости
        const messageDiv = document.createElement('div');
        messageDiv.className = 'filter-message';
        messageDiv.innerHTML = `<p style="color: #FFD700; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px;">Фильтрация по "${platform}" пока не реализована. Показаны все новости.</p>`;
        newsList.appendChild(messageDiv);
        articlesToShow = [...internalNews.map(a => ({ ...a, type: 'internal' })), ...externalNewsToShow.map(a => ({ ...a, type: 'rss' }))];
    }

    // Создаем и добавляем карточки, используя ЕДИНУЮ функцию createNewsCard
    articlesToShow.forEach(article => {
        const articleCard = createNewsCard(article, article.type);
        newsList.appendChild(articleCard);
    });

    // Обновляем активную кнопку фильтра
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(platform) || (platform === 'все' && btn.textContent === 'Все')) {
            btn.classList.add('active');
        }
    });
}

// --- Создание карточки новости для секции "Новости" ---
function createNewsCard(articleData, type) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'news-article'; // Используем класс из CSS

    let imageUrl, title, dateText, tagsHtml, description = '';

    if (type === 'internal') {
        imageUrl = articleData.shortImage || 'image/icons/Noimage.jpg';
        title = articleData.title;
        dateText = new Date(articleData.publishDate).toLocaleDateString('ru-RU');
        tagsHtml = '<span class="tag">Новость</span>';
        // description = (articleData.content || '').replace(/<[^>]*>/g, '').substring(0, 100) + '...';
    } else { // RSS
        imageUrl = articleData.imageUrl || 'image/icons/Noimage.jpg';
        title = articleData.title;
        dateText = articleData.pubDate ? new Date(articleData.pubDate).toLocaleDateString('ru-RU') : 'Дата не указана';
        tagsHtml = '<span class="tag rss-tag">RSS</span>';
        description = (articleData.description || '').replace(/<[^>]*>/g, '').substring(0, 150) + '...';
    }

    articleDiv.innerHTML = `
        <div class="news-article-image">
            <img src="${imageUrl}" alt="${title}" onerror="this.src='image/icons/Noimage.jpg';">
        </div>
        <div class="news-article-content">
            <h3 class="news-article-title">${title}</h3>
            <div class="news-article-meta">
                <span>📅 ${dateText}</span>
                <span>💬 0</span> <!-- Комментарии можно добавить позже -->
            </div>
            ${description ? `<p class="news-article-description">${description}</p>` : ''}
            <div class="news-article-tags">
                ${tagsHtml}
            </div>
        </div>
    `;

    // --- КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ ---
    // Используем addEventListener и ВСЕГДА отменяем стандартное поведение и всплытие
    articleDiv.addEventListener('click', function (event) {
        // Останавливаем всплытие события
        event.stopPropagation();
        // Отменяем стандартное поведение (например, если клик был по ссылке внутри)
        event.preventDefault();

        console.log(`Клик по статье типа ${type}:`, title); // Для отладки

        if (type === 'internal') {
            const index = articles.findIndex(a => a === articleData);
            if (index !== -1) {
                openFullArticle(index);
            } else {
                console.error("Индекс внутренней статьи не найден:", articleData);
            }
        } else {
            openFullRssArticle(articleData); // Открываем RSS-статью на вашем сайте
        }
    });

    // Дополнительная мера: отменить клики на всех дочерних элементах <a> и <img>
    // которые могут иметь свои обработчики или стандартное поведение
    const linksAndImages = articleDiv.querySelectorAll('a, img');
    linksAndImages.forEach(el => {
        el.addEventListener('click', function (event) {
            event.stopPropagation();
            event.preventDefault();
            console.log("Клик по дочернему элементу (a/img), отменен. Передаем родителю.");
            // Вручную запускаем клик по родительскому элементу (карточке)
            articleDiv.click();
        });
    });
    // --- КОНЕЦ КРИТИЧЕСКОГО ИЗМЕНЕНИЯ ---

    return articleDiv;
}
// --- КОНЕЦ создания карточки ---

// === НЕДАВНИЕ СТАТЬИ (СЛАЙДЕР) ===
function loadRecentArticles() {
    const recentArticlesSliderContent = document.getElementById('recent-articles-slider-content');
    if (!recentArticlesSliderContent) return;
    recentArticlesSliderContent.innerHTML = '';
    const recentArticles = [...articles].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate)).slice(0, 6);
    recentArticles.forEach((article, index) => {
        const articleBlock = document.createElement('div');
        articleBlock.className = 'recent-article-block';
        articleBlock.onclick = () => openFullArticle(articles.findIndex(a => a === article)); // Ищем правильный индекс
        articleBlock.innerHTML = `
            <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" class="recent-article-image" onerror="this.src='image/icons/Noimage.jpg';">
            <div class="recent-article-details">
                <div class="recent-article-title">${article.title}</div>
            </div>
        `;
        recentArticlesSliderContent.appendChild(articleBlock);
    });
}

// === МАТЕРИАЛЫ И РЕЛИЗЫ (КОЛОНКИ) ===
function loadMaterialsAndReleases() {
    const materialsContent = document.getElementById('materials-content');
    const releasesContent = document.getElementById('releases-content');

    if (materialsContent) materialsContent.innerHTML = '';
    if (releasesContent) releasesContent.innerHTML = '';

    // Материалы - последние 3 новости
    const materials = articles
        .filter(a => a.category === 'новости')
        .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
        .slice(0, 3);

    // Релизы - последние 3 обзора
    const releases = articles
        .filter(a => a.category === 'обзоры')
        .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
        .slice(0, 3);

    // Отображаем материалы
    if (materialsContent) {
        materials.forEach((article, index) => {
            const materialCard = document.createElement('div');
            materialCard.className = 'material-card';
            materialCard.onclick = () => openFullArticle(articles.findIndex(a => a === article));
            materialCard.innerHTML = `
                <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" class="material-image" onerror="this.src='image/icons/Noimage.jpg';">
                <div class="material-details">
                    <h4>${article.title}</h4>
                </div>
            `;
            materialsContent.appendChild(materialCard);
        });
    }

    // Отображаем релизы
    if (releasesContent) {
        releases.forEach((article, index) => {
            const releaseCard = document.createElement('div');
            releaseCard.className = 'release-card';
            releaseCard.onclick = () => openFullArticle(articles.findIndex(a => a === article));
            releaseCard.innerHTML = `
                <img src="${article.shortImage || 'image/icons/Noimage.jpg'}" alt="${article.title}" class="release-image" onerror="this.src='image/icons/Noimage.jpg';">
                <div class="release-details">
                    <h4>${article.title}</h4>
                </div>
            `;
            releasesContent.appendChild(releaseCard);
        });
    }
}

// === УПРАВЛЕНИЕ RSS СТАТЬЯМИ (ФУНКЦИИ) ===
function hideRssArticle(link) {
    if (!hiddenRssArticles.includes(link)) {
        hiddenRssArticles.push(link);
        localStorage.setItem('hiddenRssArticles', JSON.stringify(hiddenRssArticles));

        // Если скрыта главная RSS-статья, сбрасываем её
        if (mainRssArticleLink === link) {
            mainRssArticleLink = null;
            localStorage.removeItem('mainRssArticleLink');
            localStorage.removeItem('mainRssArticleTitle');
            localStorage.removeItem('mainRssArticleThumbnail');
            loadMainArticle();
        }

        loadArticles(getCurrentCategory());
        alert("Новость скрыта.");
    }
}

function setMainRssArticle(link, title, thumbnail) {
    mainRssArticleLink = link;
    localStorage.setItem('mainRssArticleLink', link);
    localStorage.setItem('mainRssArticleTitle', title);

    // Используем imageUrl из найденной статьи
    const rssArticle = externalNews.find(item => item.link === link);
    let imageUrlForMain = 'image/icons/Noimage.jpg';
    if (rssArticle) {
        imageUrlForMain = rssArticle.imageUrl || imageUrlForMain;
    }
    localStorage.setItem('mainRssArticleThumbnail', imageUrlForMain);

    loadMainArticle();
    loadArticles(getCurrentCategory());
    alert(`Новость "${title}" назначена главной.`);
}

// === ВНЕШНИЕ НОВОСТИ ИЗ RSS ===
function appendNewsToContainer(newsList, container, count) {
    if (!container) return;

    container.innerHTML = '';

    const filteredNews = newsList.filter(item =>
        item && item.title && item.link && !hiddenRssArticles.includes(item.link)
    );

    const sortedNews = [...filteredNews]
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, count);

    sortedNews.forEach(article => {
        const displayDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('ru-RU') : '';
        const title = article.title.length > 70 ? article.title.slice(0, 70) + '...' : article.title;

        const articleDiv = document.createElement('div');
        articleDiv.className = 'article-block'; // Используем общий класс для стилей
        articleDiv.onclick = () => openFullRssArticle(article);

        let imageUrl = article.imageUrl || 'image/icons/Noimage.jpg';
        let description = '';
        if (article.description) {
            description = article.description.replace(/<[^>]*>/g, '').slice(0, 90) + '...';
        }

        articleDiv.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column;">
                <img src="${imageUrl}"
                     alt="${title}"
                     onerror="this.src='image/icons/Noimage.jpg';"
                     style="width: 100%; height: 150px; object-fit: cover; flex-shrink: 0;">
                <div style="padding: 10px; flex-grow: 1; display: flex; flex-direction: column;">
                    <div style="font-weight: bold; color: #fff; font-size: 0.95em; margin-bottom: 5px; flex-grow: 1;">${title}</div>
                    ${displayDate ? `<small style="color: #aaa; display: block; margin-bottom: 5px;">${displayDate}</small>` : ''}
                    <p style="color: #ccc; font-size: 0.85em; margin: 0 0 10px 0; flex-grow: 1;">
                        ${description}
                    </p>
                    <div style="margin-top: auto;">
                        <span style="background-color: #4CAF50; color: white; padding: 3px 6px; border-radius: 3px; font-size: 0.75em;">RSS</span>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(articleDiv);
    });
}

function renderExternalNews() {
    const containerNews = document.getElementById('external-news-container');
    const homeGrid = document.getElementById('home-external-news-grid');

    if (containerNews) {
        let externalNewsGrid = document.getElementById('external-news-grid');
        if (!externalNewsGrid) {
            containerNews.innerHTML = `
                <h3 style="color: gold; margin: 20px 0 10px;">🎮 Игровые новости</h3>
                <div id="external-news-grid" class="articles-grid"></div>
            `;
            externalNewsGrid = document.getElementById('external-news-grid');
        }
        appendNewsToContainer(externalNews, externalNewsGrid, 6);
    }

    if (homeGrid) {
        appendNewsToContainer(externalNews, homeGrid, 4);
    }
}

// Новая функция для отображения внешних новостей на главной
function renderHomeExternalNews() {
    const homeGrid = document.getElementById('home-external-news-grid');
    if (homeGrid) {
        appendNewsToContainer(externalNews, homeGrid, 4);
    }
}

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ИЗВЛЕЧЕНИЯ ПЕРВОГО ИЗОБРАЖЕНИЯ ИЗ HTML ===
function extractFirstImageFromHtml(htmlString) {
    if (!htmlString) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : null;
}

// === ЗАГРУЗКА RSS ===
fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.stopgame.ru/rss_all.xml')
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log('Получен ответ от RSS API (StopGame):', data);
        if (data.status === 'ok' && data.items && data.items.length > 0) {
            externalNews = data.items.map(item => {
                let imageUrl = null;

                // 1. Попробуем получить изображение из enclosure (как было)
                if (item.enclosure && item.enclosure.url) {
                    imageUrl = item.enclosure.url;
                }

                // 2. Если enclosure не дал результата, ищем в description
                if (!imageUrl && item.description) {
                    imageUrl = extractFirstImageFromHtml(item.description);
                }

                // 3. Если и в description не было, ищем в content:encoded (если есть)
                if (!imageUrl && item['content:encoded']) {
                    imageUrl = extractFirstImageFromHtml(item['content:encoded']);
                }

                // Если так и не нашли, используем заглушку
                imageUrl = imageUrl || 'image/icons/Noimage.jpg';

                return {
                    title: item.title || '',
                    link: item.link || '',
                    pubDate: item.pubDate || '',
                    enclosure: item.enclosure ? {
                        url: item.enclosure.url,
                        type: item.enclosure.type,
                        length: item.enclosure.length
                    } : null,
                    description: item.description || '',
                    'content:encoded': item['content:encoded'] || '', // Сохраняем на случай
                    imageUrl: imageUrl // Новое поле с URL изображения
                };
            });
            console.log('✅ RSS StopGame загружен и отфильтрован с изображениями:', externalNews);
        } else {
            console.warn('⚠️ RSS API вернул статус "fail" или пустой items:', data);
            externalNews = []; // Очищаем, если ничего нет
        }
    })
    .catch(err => {
        console.error('❌ Ошибка загрузки или обработки RSS (StopGame):', err);
    })
    .finally(() => {
        console.log("Загрузка статей после попытки загрузки RSS...");
        loadArticles('все'); // Загружаем все статьи после попытки загрузки
        // Вызываем filterNews('все') для отображения новостей по умолчанию в секции новостей
        setTimeout(() => {
            const newsSection = document.getElementById('news');
            if (newsSection && !newsSection.classList.contains('hidden')) {
                filterNews('все');
            }
        }, 100);
    });

// === НАВИГАЦИЯ И ОТОБРАЖЕНИЕ СЕКЦИЙ ===
// --- ИЗМЕНЕНО: Добавлена глобальная переменная для отслеживания текущей секции ---
let currentSection = 'home';

function showSection(sectionId) {
    console.log(`Показ секции: ${sectionId}`);
    // --- ИЗМЕНЕНО: Сохраняем текущую секцию перед переходом ---
    currentSection = sectionId;

    document.querySelectorAll('.container').forEach(section => {
        if (section.id !== sectionId) {
            section.classList.remove('visible');
            setTimeout(() => {
                section.style.display = 'none';
            }, 500);
        }
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.style.display = 'block';
        setTimeout(() => {
            activeSection.classList.add('visible');
        }, 0);
        if (sectionId === 'home') {
            // Убедимся, что статьи загружены
            if (articles.length === 0) {
                const storedArticles = JSON.parse(localStorage.getItem('articles')) || [];
                articles = storedArticles;
            }
            loadMainArticle();
            renderHomeExternalNews();
            loadRecentArticles();
            loadMaterialsAndReleases();
        } else if (sectionId === 'news') {
            loadArticles('новости');
            filterNews('все'); // Отображаем все новости по умолчанию
        } else if (sectionId === 'reviews') {
            loadArticles('обзоры');
        } else if (sectionId === 'guides') {
            loadArticles('гайды');
        } else if (sectionId === 'admin') {
            loadArticles('все');
        } else if (sectionId === 'community') {
            loadArticlesForDiscussion();
        }
    } else {
        console.error(`Секция с id '${sectionId}' не найдена.`);
    }
}

function getCurrentCategory() {
    const visibleSection = document.querySelector('.container:not(.hidden):not(.hidden)');
    if (visibleSection) {
        if (visibleSection.id === 'news') return 'новости';
        if (visibleSection.id === 'reviews') return 'обзоры';
        if (visibleSection.id === 'guides') return 'гайды';
    }
    return 'все';
}

// === ГЛАВНАЯ СТАТЬЯ ===
let mainArticleIndex = localStorage.getItem('mainArticleIndex') ? parseInt(localStorage.getItem('mainArticleIndex'), 10) : null;

function setMainArticle(index) {
    if (articles[index]) {
        mainArticleIndex = index;
        localStorage.setItem('mainArticleIndex', mainArticleIndex);
        loadMainArticle();
        loadArticles(getCurrentCategory());
        alert(`Статья "${articles[index].title}" назначена главной.`);
    }
}

function loadMainArticle() {
    const titleElement = document.querySelector('.main-article-title');
    const imageElement = document.querySelector('.main-article-image');
    const imageContainer = document.querySelector('.main-article-image-container'); // Получаем контейнер для клика
    const storedRssLink = localStorage.getItem('mainRssArticleLink');

    // --- ИСПРАВЛЕНИЕ 1: Загрузка статей на главной ---
    // Убедимся, что статьи загружены при первой загрузке главной страницы
    if (articles.length === 0) {
        const storedArticles = JSON.parse(localStorage.getItem('articles')) || [];
        articles = storedArticles;
    }
    // --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---

    // --- ИСПРАВЛЕНИЕ 2: Проверяем сначала RSS ---
    if (storedRssLink) {
        const rssArticle = externalNews.find(item => item.link === storedRssLink);
        if (rssArticle && titleElement && imageElement && imageContainer) {
            titleElement.innerText = localStorage.getItem('mainRssArticleTitle') || rssArticle.title;
            // Используем imageUrl, найденное при обработке RSS
            let mainRssImageUrl = localStorage.getItem('mainRssArticleThumbnail');
            if (!mainRssImageUrl || mainRssImageUrl === 'image/icons/Noimage.jpg') {
                mainRssImageUrl = rssArticle.imageUrl || 'image/icons/Noimage.jpg';
                localStorage.setItem('mainRssArticleThumbnail', mainRssImageUrl);
            }
            imageElement.src = mainRssImageUrl;
            imageElement.onerror = function () { this.src = 'image/icons/Noimage.jpg'; };
            // --- ИСПРАВЛЕНИЕ 3: Изменяем обработчик клика для RSS ---
            // Убираем старый обработчик, если был
            imageContainer.onclick = null;
            imageContainer.style.cursor = 'pointer';
            imageContainer.title = "Кликните, чтобы прочитать";
            imageContainer.onclick = () => openFullRssArticle(rssArticle); // Открываем на сайте
            // --- КОНЕЦ ИСПРАВЛЕНИЯ 3 ---
            return; // Завершаем, если нашли RSS-статью
        }
    }

    const indexToLoad = mainArticleIndex !== null ? mainArticleIndex : (articles.length > 0 ? 0 : null);
    const article = articles[indexToLoad];

    if (article && titleElement && imageElement) {
        titleElement.innerText = article.title;
        imageElement.src = article.shortImage || 'image/icons/Noimage.jpg';
        imageElement.onerror = function () { this.src = 'image/icons/Noimage.jpg'; };
        // Открытие внутренней статьи
        imageElement.parentElement.parentElement.onclick = () => openFullArticle(indexToLoad);
    } else if (titleElement) {
        titleElement.innerText = "Статья не выбрана";
        if (imageElement) imageElement.src = 'image/icons/Noimage.jpg';
        if (imageElement) imageElement.parentElement.parentElement.onclick = null;
    }
}

// === ПОЛНАЯ СТАТЬЯ ===
function openFullArticle(index) {
    const article = articles[index];
    if (!article) {
        console.error("Статья не найдена по индексу:", index);
        return;
    }

    const titleElement = document.getElementById('full-article-title');
    const contentElement = document.getElementById('full-article-content');

    if (titleElement && contentElement) {
        titleElement.innerText = article.title;
        contentElement.innerHTML = article.content;
        showSection('full-article');
    } else {
        console.error("Элементы для отображения полной статьи не найдены.");
    }
}

// === ПОЛНАЯ RSS СТАТЬЯ ===
function openFullRssArticle(rssItem) {
    const titleElement = document.getElementById('full-rss-article-title');
    const metaElement = document.getElementById('full-rss-article-meta');
    const contentElement = document.getElementById('full-rss-article-content');

    if (titleElement && metaElement && contentElement) {
        // Устанавливаем заголовок
        titleElement.innerText = rssItem.title || 'Без заголовка';

        // Устанавливаем мета-информацию (дата публикации)
        const pubDate = rssItem.pubDate ? new Date(rssItem.pubDate).toLocaleString('ru-RU') : 'Дата не указана';
        metaElement.innerText = `Опубликовано: ${pubDate}`;
        metaElement.style.color = '#aaa';
        metaElement.style.fontSize = '0.9em';
        metaElement.style.marginBottom = '15px';

        // Очищаем предыдущий контент
        contentElement.innerHTML = '';

        // Определяем контент для отображения
        // Приоритет: content:encoded -> description -> сообщение об отсутствии
        let rawContent = rssItem['content:encoded'] || rssItem.description || '<p>Содержимое недоступно.</p>';

        // Очищаем HTML от потенциально опасных элементов
        let safeContent = sanitizeHtml(rawContent);

        // Создаем контейнер для контента
        const articleContent = document.createElement('div');
        articleContent.innerHTML = safeContent;

        // Добавляем очищенный контент в основной элемент
        contentElement.appendChild(articleContent);

        // --- Обновляем или создаем кнопку "Читать оригинал" ---
        let readOriginalButton = document.getElementById('full-rss-article-read-original-button');
        if (!readOriginalButton) {
            readOriginalButton = document.createElement('a');
            readOriginalButton.id = 'full-rss-article-read-original-button';
            readOriginalButton.className = 'rss-read-original-button'; // Новый класс для стилей
            readOriginalButton.style.display = 'inline-block'; // Меняем на inline-block
            readOriginalButton.style.marginTop = '20px';
            // Стили теперь в CSS
            readOriginalButton.innerText = 'Читать в источнике'; // Надпись изменена

            contentElement.appendChild(readOriginalButton);
        }
        // Обновляем ссылку и цель кнопки "Читать оригинал"
        readOriginalButton.href = rssItem.link || '#';
        readOriginalButton.target = '_blank';

        // --- Обновляем или создаем кнопку "Назад" внутри контента ---
        let backButton = document.getElementById('full-rss-article-back-button-inner');
        if (!backButton) {
            backButton = document.createElement('button');
            backButton.id = 'full-rss-article-back-button-inner';
            backButton.className = 'rss-back-button'; // Новый класс для стилей
            backButton.innerText = '← Назад';

            // Вставляем кнопку "Назад" в начало contentElement
            contentElement.insertBefore(backButton, contentElement.firstChild);
        }

        // Обновляем обработчик события для кнопки "Назад"
        backButton.onclick = () => {
            // Используем showSection для корректного перехода
            // Предполагаем, что обычно пользователь приходит из 'news'
            showSection('news');
            // Альтернатива: history.back(); если нужно строго назад по истории
        };


        // Показываем секцию полной RSS статьи
        showSection('full-rss-article');

    } else {
        console.error("Элементы для отображения полной RSS статьи не найдены.");
        // Резервный вариант: открыть в новой вкладке
        if (rssItem.link) {
            window.open(rssItem.link, '_blank');
        }
    }
}

function sanitizeHtml(htmlString) {
    if (!htmlString) return '';
    // Создаем временный элемент
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;

    // Удаляем потенциально опасные теги
    const forbiddenTags = ['script', 'object', 'embed', 'iframe', 'form'];
    forbiddenTags.forEach(tagName => {
        const elements = temp.getElementsByTagName(tagName);
        // Используем while, потому что коллекция NodeList динамически обновляется
        while (elements[0]) {
            elements[0].parentNode.removeChild(elements[0]);
        }
    });

    // Удаляем атрибуты on* (например, onclick, onload)
    const allElements = temp.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        // Создаем копию коллекции атрибутов, так как оригинальная изменяется при удалении
        const attrs = Array.prototype.slice.call(element.attributes);
        for (let j = 0; j < attrs.length; j++) {
            const attr = attrs[j];
            if (attr.name.startsWith('on')) {
                element.removeAttribute(attr.name);
            }
        }
    }

    return temp.innerHTML;
}

// --- Добавим обработчик для кнопки "Назад" внутри секции full-rss-article, если она там есть ---
document.addEventListener('DOMContentLoaded', function() {
    const innerBackButton = document.getElementById('full-rss-article-back-button-inner');
    if (innerBackButton) {
        innerBackButton.addEventListener('click', function(e) {
            e.preventDefault();
            history.back();
            // Или showSection(currentSection); если нужно явно указать
        });
    }
});

// === СООБЩЕСТВО (КОММЕНТАРИИ) ===
function loadArticlesForDiscussion() {
    const articlesList = document.getElementById('articles-list');
    if (!articlesList) return;
    articlesList.innerHTML = '';
    articles.forEach((article, index) => {
        if (document.getElementById(`comment-form-${index}`)) return;
        const articleDiv = document.createElement('div');
        articleDiv.className = 'article-preview';
        articleDiv.innerHTML = `
            <h4 class="article-title">${article.title}</h4>
            <p class="article-content">${(article.content || '').replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
            <button class="add-feedback-button" onclick="showCommentForm(${index})">Комментировать</button>
            <div class="feedback-list" id="feedback-list-${index}"></div>
            <div id="comment-form-${index}" style="display:none; margin-top: 10px;">
                <div id="quill-container-${index}" style="height: 100px;"></div>
                <button onclick="addComment(${index})">Добавить комментарий</button>
            </div>
        `;
        articlesList.appendChild(articleDiv);
        loadFeedbacksForArticle(index);
    });
}

function showCommentForm(articleIndex) {
    const commentForm = document.getElementById(`comment-form-${articleIndex}`);
    if (!commentForm) return;
    const isVisible = commentForm.style.display !== 'none';
    commentForm.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        const quillContainerId = `quill-container-${articleIndex}`;
        const existingQuill = document.querySelector(`#${quillContainerId} .ql-editor`);
        if (!existingQuill) {
            new Quill(`#${quillContainerId}`, {
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                    ],
                },
                placeholder: 'Напишите свой комментарий...',
                theme: 'snow',
            });
        }
    }
}

function addComment(articleIndex) {
    const quillContainerId = `quill-container-${articleIndex}`;
    const quillContainer = document.querySelector(`#${quillContainerId}`);
    if (!quillContainer) {
        console.error("Контейнер Quill не найден для индекса:", articleIndex);
        return;
    }
    const quillEditor = quillContainer.querySelector('.ql-editor');
    if (!quillEditor) {
        console.error("Редактор Quill не найден в контейнере:", quillContainerId);
        return;
    }
    const commentContent = quillEditor.innerHTML;
    if (commentContent.trim() === '' || commentContent === '<p><br></p>') {
        alert("Пожалуйста, напишите комментарий.");
        return;
    }
    if (!feedbacks[articleIndex]) {
        feedbacks[articleIndex] = [];
    }
    feedbacks[articleIndex].push(commentContent);
    localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
    loadFeedbacksForArticle(articleIndex);
    const commentForm = document.getElementById(`comment-form-${articleIndex}`);
    if (commentForm) {
        commentForm.style.display = 'none';
    }
    const quillInstance = Quill.find(quillEditor.parentNode);
    if (quillInstance) {
        quillInstance.setContents([{ insert: '\n' }]);
    }
}

function loadFeedbacksForArticle(articleIndex) {
    const feedbackList = document.getElementById(`feedback-list-${articleIndex}`);
    if (!feedbackList) return;
    feedbackList.innerHTML = '';
    const articleFeedbacks = feedbacks[articleIndex] || [];
    if (articleFeedbacks.length === 0) {
        feedbackList.innerHTML = '<p>Нет комментариев.</p>';
    } else {
        articleFeedbacks.forEach((feedback) => {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'feedback';
            feedbackDiv.innerHTML = feedback;
            feedbackList.appendChild(feedbackDiv);
        });
    }
}

// === АДМИНКА ===
function editArticle(index) {
    const article = articles[index];
    if (!article) return;
    document.getElementById('article-title').value = article.title || '';
    document.getElementById('article-category').value = article.category || '';
    quill.root.innerHTML = article.content || '';
    currentEditingIndex = index;
    showSection('admin');
}

function deleteArticle(index) {
    if (confirm("Вы уверены, что хотите удалить эту статью?")) {
        articles.splice(index, 1);
        localStorage.setItem('articles', JSON.stringify(articles));
        if (mainArticleIndex === index) {
            mainArticleIndex = articles.length > 0 ? 0 : null;
            localStorage.setItem('mainArticleIndex', mainArticleIndex);
            loadMainArticle();
        } else if (mainArticleIndex !== null && mainArticleIndex > index) {
            mainArticleIndex--;
            localStorage.setItem('mainArticleIndex', mainArticleIndex);
        }
        loadArticles(getCurrentCategory());
        alert("Статья удалена!");
    }
}

function addArticle() {
    const title = document.getElementById('article-title').value.trim();
    const shortImageInput = document.getElementById('article-short-image');
    const content = quill.root.innerHTML.trim();
    const category = document.getElementById('article-category').value;
    if (!title || !content || !category) {
        alert("Пожалуйста, заполните все обязательные поля (Заголовок, Категория, Содержимое).");
        return;
    }
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
}

function saveArticle(title, content, category, shortImage) {
    const publishDate = new Date().toISOString();
    if (currentEditingIndex !== null && articles[currentEditingIndex]) {
        articles[currentEditingIndex] = { ...articles[currentEditingIndex], title, content, category, shortImage, publishDate };
        currentEditingIndex = null;
    } else {
        articles.push({ title, content, category, shortImage, publishDate });
    }
    localStorage.setItem('articles', JSON.stringify(articles));
    alert(`Статья "${title}" сохранена!`);
    clearArticleForm();
    loadArticles(getCurrentCategory());
}

function clearArticleForm() {
    document.getElementById('article-title').value = '';
    document.getElementById('article-short-image').value = '';
    document.getElementById('article-category').value = '';
    quill.root.innerHTML = '';
    currentEditingIndex = null;
}

// === ПРОФИЛЬ ===
function toggleProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) profileMenu.classList.toggle('hidden');
}

function closeProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) profileMenu.classList.add('hidden');
}

document.addEventListener('click', function (event) {
    const menu = document.getElementById('profile-menu');
    const avatar = document.getElementById('profile-avatar-header');
    if (menu && avatar && !menu.contains(event.target) && !avatar.contains(event.target)) {
        menu.classList.add('hidden');
    }
});

function saveProfile() {
    if (!currentUser) {
        alert("Пользователь не авторизован.");
        return;
    }
    currentUser.email = document.getElementById('profile-email').value;
    const avatarInput = document.getElementById('avatar-upload');
    if (avatarInput && avatarInput.files.length > 0) {
        const file = avatarInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = function () {
                currentUser.avatar = reader.result;
                updateProfileDisplay();
                saveUser();
                alert("Изменения успешно сохранены!");
            };
            reader.readAsDataURL(file);
        } else {
            saveUser();
            alert("Изменения успешно сохранены!");
        }
    } else {
        saveUser();
        alert("Изменения успешно сохранены!");
    }
}

let cropper;
document.getElementById('avatar-upload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const cropImage = document.getElementById('crop-image');
    const cropContainer = document.getElementById('crop-container');
    const croppedImagePreview = document.getElementById('cropped-image');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (cropImage) cropImage.src = '';
    if (croppedImagePreview) {
        croppedImagePreview.src = '';
        croppedImagePreview.style.display = 'none';
    }
    if (cropContainer) cropContainer.style.display = 'none';
    if (file && cropImage && cropContainer) {
        const reader = new FileReader();
        reader.onload = function (e) {
            cropImage.src = e.target.result;
            cropImage.onload = () => {
                cropContainer.style.display = 'block';
                cropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    autoCropArea: 1
                });
            };
        };
        reader.readAsDataURL(file);
    }
});

function cropImage() {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas({ width: 100, height: 100 });
        const croppedDataURL = canvas.toDataURL('image/png');
        const preview = document.getElementById('cropped-image');
        if (preview) {
            preview.src = croppedDataURL;
            preview.style.display = 'block';
        }
    }
}

function saveAvatar() {
    const croppedImage = document.getElementById('cropped-image');
    if (croppedImage && croppedImage.src && croppedImage.src.startsWith('data:image')) {
        if (currentUser) {
            currentUser.avatar = croppedImage.src;
            updateProfileDisplay();
            saveUser();
            alert("Аватар успешно сохранен!");
            const cropContainer = document.getElementById('crop-container');
            if (cropContainer) cropContainer.style.display = 'none';
        } else {
            alert("Пользователь не авторизован.");
        }
    } else {
        alert("Сначала обрежьте изображение.");
    }
}

// === АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ===
function updateAuthButtons() {
    const authButton = document.getElementById('auth-button');
    const profileAvatar = document.getElementById('profile-avatar-header');
    const adminLink = document.getElementById('admin-link');
    if (currentUser) {
        if (authButton) authButton.style.display = 'none';
        if (profileAvatar) {
            profileAvatar.src = currentUser.avatar || 'image/icons/Noimage.jpg';
            profileAvatar.style.display = 'block';
        }
        if (adminLink) {
            adminLink.style.display = (currentUser.role === 'admin') ? 'block' : 'none';
        }
    } else {
        if (authButton) authButton.style.display = 'block';
        if (profileAvatar) profileAvatar.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

function register() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
        alert("Пожалуйста, введите имя пользователя и пароль.");
        return;
    }
    if (users.find(user => user.username === username)) {
        alert("Пользователь с таким именем уже существует.");
        return;
    }
    users.push({ username, password, role: 'user', registrationDate: new Date().toISOString().split('T')[0] });
    localStorage.setItem('users', JSON.stringify(users));
    alert("Регистрация успешна! Теперь вы можете войти.");
    usernameInput.value = '';
    passwordInput.value = '';
}

function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const storedUsers = JSON.parse(localStorage.getItem('users')) || [];
    users = [...users, ...storedUsers];
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = user;
        saveUser();
        alert("Успешный вход!");
        updateAuthButtons();
        showSection('home');
    } else {
        alert("Неправильный логин или пароль.");
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    alert("Вы вышли из системы.");
    updateAuthButtons();
    showSection('auth');
}

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM загружен, инициализация...");
    loadUser();
    showSection('home');
});

window.addEventListener('load', () => {
    console.log("Страница полностью загружена.");
});