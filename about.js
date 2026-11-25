// ========================================
// SUPABASE CONFIGURATION
// ========================================

const SUPABASE_URL =
    'https://qeiospslkykwdrbgflzb.supabase.co';

const SUPABASE_KEY =
    'sb_publishable_HuG7VQQDL5hbhM3zwvOJIA_w0sE5H1V';

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ========================================
// SETTINGS
// ========================================

const PAGE_SIZE = 10;

let currentPage = 0;
let totalChapters = 0;
let isLoadingChapters = false;


// ========================================
// ELEMENTS
// ========================================

const chaptersContainer =
    document.getElementById('chapters');

const keyFiguresContainer =
    document.getElementById('key-figures');

const historySection =
    document.getElementById('history-section');

const keyFiguresSection =
    document.getElementById('key-figures-section');

const historyTab =
    document.getElementById('history-tab');

const keyFiguresTab =
    document.getElementById('key-figures-tab');

const heroSubtitle =
    document.querySelector('.hero-subtitle');

let keyFiguresLoaded = false;

const pagination =
    document.getElementById('chapters-pagination');

const previousButton =
    document.getElementById('previous-page');

const nextButton =
    document.getElementById('next-page');

const pageIndicator =
    document.getElementById('page-indicator');

const lightbox =
    document.getElementById('lightbox');

const lightboxImage =
    document.getElementById('lightbox-image');

const lightboxClose =
    document.getElementById('lightbox-close');


// ========================================
// IMAGE LIGHTBOX
// ========================================

function openImage(src, alt) {
    lightboxImage.src = src;
    lightboxImage.alt = alt || 'Chapter image';

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImage() {
    lightbox.classList.remove('active');
    lightboxImage.removeAttribute('src');

    document.body.style.overflow = '';
}

lightboxClose.addEventListener('click', closeImage);

lightbox.addEventListener('click', function(event) {
    if (event.target === lightbox) {
        closeImage();
    }
});

document.addEventListener('keydown', function(event) {
    if (
        event.key === 'Escape' &&
        lightbox.classList.contains('active')
    ) {
        closeImage();
    }
});


// ========================================
// FORMAT DATE
// ========================================

function formatDate(dateString) {
    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}


// ========================================
// SHOW STATUS
// ========================================

function showStatus(message) {
    chaptersContainer.replaceChildren();

    const status = document.createElement('div');

    status.id = 'chapters-status';
    status.textContent = message;

    chaptersContainer.appendChild(status);

    pagination.hidden = true;
}


// ========================================
// DISPLAY CHAPTERS
// ========================================

function displayChapters(chapters, images, startNumber) {

    chaptersContainer.replaceChildren();

    if (!chapters || chapters.length === 0) {
        showStatus(
            'The history of the empire has not been published yet.'
        );
        return;
    }

    chapters.forEach((chapter, index) => {

        const chapterElement =
            document.createElement('article');

        chapterElement.className = 'chapter';


        // CHAPTER NUMBER

        const number =
            document.createElement('div');

        number.className = 'chapter-number';

        number.textContent =
            'CHAPTER ' +
            String(startNumber + index + 1).padStart(2, '0');


        // CHAPTER TITLE

        const title =
            document.createElement('h2');

        title.textContent =
            chapter.title || 'Untitled chapter';


        // CHAPTER CONTENT

        const content =
            document.createElement('div');

        content.className = 'chapter-content';

        content.textContent =
            chapter.content || '';


        chapterElement.appendChild(number);
        chapterElement.appendChild(title);
        chapterElement.appendChild(content);


        // CHAPTER IMAGES

        const chapterImages = images.filter(
            image => image.chapter_id === chapter.id
        );

        if (chapterImages.length > 0) {

            const imagesContainer =
                document.createElement('div');

            imagesContainer.className = 'chapter-images';

            chapterImages.forEach(imageData => {

                const image =
                    document.createElement('img');

                image.src = imageData.image_url;

                image.alt =
                    chapter.title || 'Chapter image';

                image.loading = 'lazy';

                image.addEventListener('click', function() {
                    openImage(
                        imageData.image_url,
                        chapter.title
                    );
                });

                image.addEventListener('error', function() {
                    image.remove();
                });

                imagesContainer.appendChild(image);

            });

            chapterElement.appendChild(imagesContainer);
        }


        // DATE

        const date =
            document.createElement('div');

        date.style.color = '#71808e';
        date.style.fontSize = '10px';
        date.style.marginTop = '20px';

        date.textContent =
            'PUBLISHED: ' + formatDate(chapter.created_at);

        chapterElement.appendChild(date);

        chaptersContainer.appendChild(chapterElement);

    });

}


// ========================================
// UPDATE PAGINATION
// ========================================

function updatePagination() {

    const totalPages = Math.ceil(totalChapters / PAGE_SIZE);

    pagination.hidden = totalPages <= 1;

    pageIndicator.textContent =
        `PAGE ${currentPage + 1} OF ${totalPages}`;

    previousButton.disabled = currentPage === 0;

    nextButton.disabled =
        currentPage >= totalPages - 1;
}


// ========================================
// LOAD HISTORY PAGE
// ========================================

async function loadChapters() {

    if (isLoadingChapters) {
        return;
    }

    isLoadingChapters = true;

    showStatus('Loading history...');

    try {

        const start = currentPage * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;


        // LOAD ONLY THE CURRENT PAGE

        const {
            data: chapters,
            error: chaptersError,
            count
        } = await db
            .from('chapters')
            .select('*', { count: 'exact' })
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true })
            .range(start, end);

        if (chaptersError) {
            throw chaptersError;
        }

        totalChapters = count || 0;


        // NO CHAPTERS

        if (!chapters || chapters.length === 0) {

            displayChapters([], [], start);

            return;
        }


        // LOAD IMAGES ONLY FOR CURRENT PAGE

        const chapterIds =
            chapters.map(chapter => chapter.id);

        const {
            data: images,
            error: imagesError
        } = await db
            .from('chapter_images')
            .select('*')
            .in('chapter_id', chapterIds)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (imagesError) {
            throw imagesError;
        }


        // DISPLAY CURRENT PAGE

        displayChapters(
            chapters,
            images || [],
            start
        );

        updatePagination();

    } catch (error) {

        console.error(
            'Error loading empire history:',
            error
        );

        showStatus(
            'Could not load history: ' + error.message
        );

    } finally {

        isLoadingChapters = false;

    }

}


// ========================================
// PAGINATION BUTTONS
// ========================================

previousButton.addEventListener('click', function() {

    if (currentPage > 0 && !isLoadingChapters) {

        currentPage--;

        loadChapters();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

});

nextButton.addEventListener('click', function() {

    const totalPages = Math.ceil(totalChapters / PAGE_SIZE);

    if (
        currentPage < totalPages - 1 &&
        !isLoadingChapters
    ) {

        currentPage++;

        loadChapters();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

});




// ========================================
// ABOUT US SECTION TABS
// ========================================

function activateAboutTab(tabName) {

    const showHistory = tabName === 'history';

    historySection.hidden = !showHistory;
    keyFiguresSection.hidden = showHistory;

    historyTab.classList.toggle('active', showHistory);
    keyFiguresTab.classList.toggle('active', !showHistory);

    heroSubtitle.textContent = showHistory
        ? 'THE HISTORY OF KIRYAT ELIEZER EMPIRE'
        : 'IMPORTANT PEOPLE OF THE KIRYAT ELIEZER EMPIRE';

    if (!showHistory && !keyFiguresLoaded) {
        loadKeyFigures();
    }
}

historyTab.addEventListener('click', function() {
    activateAboutTab('history');
});

keyFiguresTab.addEventListener('click', function() {
    activateAboutTab('key-figures');
});


// ========================================
// DISPLAY KEY FIGURES
// ========================================

function showKeyFiguresStatus(message) {
    keyFiguresContainer.replaceChildren();

    const status = document.createElement('div');
    status.id = 'key-figures-status';
    status.textContent = message;
    keyFiguresContainer.appendChild(status);
}

function displayKeyFigures(figures) {

    keyFiguresContainer.replaceChildren();

    if (!figures || figures.length === 0) {
        showKeyFiguresStatus('No key figures have been published yet.');
        return;
    }

    figures.forEach(figure => {

        const card = document.createElement('article');
        card.className = 'key-figure-card';

        if (figure.image_url) {
            const image = document.createElement('img');
            image.src = figure.image_url;
            image.alt = figure.name || 'Key figure portrait';
            image.loading = 'lazy';
            image.addEventListener('click', function() {
                openImage(figure.image_url, figure.name || 'Key figure portrait');
            });
            image.addEventListener('error', function() {
                image.remove();
            });
            card.appendChild(image);
        }

        const content = document.createElement('div');
        content.className = 'key-figure-card-content';

        const name = document.createElement('h3');
        name.textContent = figure.name || 'Unnamed figure';
        content.appendChild(name);

        if (figure.position) {
            const position = document.createElement('div');
            position.className = 'key-figure-position';
            position.textContent = figure.position;
            content.appendChild(position);
        }

        if (figure.biography) {
            const biography = document.createElement('div');
            biography.className = 'key-figure-biography';
            biography.textContent = figure.biography;
            content.appendChild(biography);
        }

        card.appendChild(content);
        keyFiguresContainer.appendChild(card);

    });
}


// ========================================
// LOAD KEY FIGURES FROM SUPABASE
// ========================================

async function loadKeyFigures() {

    showKeyFiguresStatus('Loading key figures...');

    try {
        const { data: figures, error } = await db
            .from('key_figures')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) throw error;

        displayKeyFigures(figures || []);
        keyFiguresLoaded = true;

    } catch (error) {
        console.error('Error loading key figures:', error);
        showKeyFiguresStatus('Could not load key figures: ' + error.message);
    }
}


// ========================================
// INITIALIZE
// ========================================

loadChapters();
