
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
// ELEMENTS
// ========================================

const chaptersContainer =
    document.getElementById('chapters');

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
// DISPLAY CHAPTERS
// ========================================

function displayChapters(chapters, images) {

    chaptersContainer.replaceChildren();

    if (!chapters || chapters.length === 0) {
        showStatus('The history of the empire has not been published yet.');
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
            'CHAPTER ' + String(index + 1).padStart(2, '0');


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
// SHOW STATUS
// ========================================

function showStatus(message) {

    chaptersContainer.replaceChildren();

    const status =
        document.createElement('div');

    status.id = 'chapters-status';
    status.textContent = message;

    chaptersContainer.appendChild(status);

}


// ========================================
// LOAD HISTORY FROM SUPABASE
// ========================================

async function loadChapters() {

    showStatus('Loading history...');

    try {

        // LOAD CHAPTERS

        const { data: chapters, error: chaptersError } =
            await db
                .from('chapters')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });

        if (chaptersError) {
            throw chaptersError;
        }


        // NO CHAPTERS

        if (!chapters || chapters.length === 0) {
            displayChapters([], []);
            return;
        }


        // LOAD ALL CHAPTER IMAGES

        const chapterIds =
            chapters.map(chapter => chapter.id);

        const { data: images, error: imagesError } =
            await db
                .from('chapter_images')
                .select('*')
                .in('chapter_id', chapterIds)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });

        if (imagesError) {
            throw imagesError;
        }


        // DISPLAY EVERYTHING

        displayChapters(
            chapters,
            images || []
        );

    } catch (error) {

        console.error(
            'Error loading empire history:',
            error
        );

        showStatus(
            'Could not load history: ' + error.message
        );

    }

}


// ========================================
// INITIALIZE
// ========================================

loadChapters();
