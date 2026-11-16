
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
// CREATE MAP
// ========================================

const map = L.map('map').setView([33.8, 35.8], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// ========================================
// LOAD GEOJSON
// ========================================

fetch('./frontline.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('GeoJSON file not found');
        }

        return response.json();
    })
    .then(data => {

        const frontline = L.geoJSON(data, {

            style: function(feature) {

                const properties = feature.properties || {};

                return {
                    color: properties.stroke || '#ff3333',
                    weight: 3,
                    fillColor: properties.fill || '#ff3333',
                    fillOpacity: properties['fill-opacity'] ?? 0.3
                };
            },

            onEachFeature: function(feature, layer) {

                const properties = feature.properties || {};
                const name = properties.name || properties.Name;

                if (name) {
                    layer.bindPopup(name);
                }
            }

        }).addTo(map);

        if (frontline.getBounds().isValid()) {
            map.fitBounds(frontline.getBounds());
        }

    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        alert('Could not load frontline.geojson');
    });


// ========================================
// IMAGE LIGHTBOX
// ========================================

const lightbox = document.createElement('div');

lightbox.id = 'image-lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
lightbox.setAttribute('aria-label', 'Image viewer');

const lightboxImage = document.createElement('img');

lightboxImage.id = 'lightbox-image';
lightboxImage.alt = '';

const closeButton = document.createElement('button');

closeButton.id = 'lightbox-close';
closeButton.type = 'button';
closeButton.textContent = '×';
closeButton.setAttribute('aria-label', 'Close image viewer');

const lightboxHint = document.createElement('div');

lightboxHint.id = 'lightbox-hint';
lightboxHint.textContent = 'Press ESC or click outside the image to close';

lightbox.appendChild(lightboxImage);
lightbox.appendChild(closeButton);
lightbox.appendChild(lightboxHint);

document.body.appendChild(lightbox);


// Open image

function openImageViewer(src, alt) {

    lightboxImage.src = src;
    lightboxImage.alt = alt || 'News image';

    lightbox.classList.add('active');

    document.body.style.overflow = 'hidden';

    closeButton.focus();
}


// Close image

function closeImageViewer() {

    lightbox.classList.remove('active');

    lightboxImage.removeAttribute('src');

    document.body.style.overflow = '';

}


// Close button

closeButton.addEventListener('click', closeImageViewer);


// Close when clicking outside the image

lightbox.addEventListener('click', function(event) {

    if (
        event.target === lightbox ||
        event.target === lightboxHint
    ) {
        closeImageViewer();
    }

});


// Close with ESC

document.addEventListener('keydown', function(event) {

    if (
        event.key === 'Escape' &&
        lightbox.classList.contains('active')
    ) {
        closeImageViewer();
    }

});


// ========================================
// NEWS FEED
// ========================================

const newsList = document.getElementById('news-list');

let isLoadingNews = false;


function showNewsStatus(message) {

    newsList.replaceChildren();

    const status = document.createElement('div');
    status.className = 'news-status';
    status.textContent = message;

    newsList.appendChild(status);
}


// ========================================
// FORMAT DATE
// ========================================

function formatNewsDate(dateString) {

    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

}


// ========================================
// DISPLAY NEWS
// ========================================

function displayNews(newsItems) {

    newsList.replaceChildren();

    if (!newsItems || newsItems.length === 0) {
        showNewsStatus('No news published yet.');
        return;
    }

    newsItems.forEach(news => {

        const card = document.createElement('article');
        card.className = 'news-card';


        // DATE

        const date = document.createElement('div');
        date.className = 'news-date';
        date.textContent = formatNewsDate(news.created_at);


        // TITLE

        const title = document.createElement('h3');
        title.className = 'news-title';
        title.textContent = news.title || 'Untitled news';


        card.appendChild(date);
        card.appendChild(title);


        // IMAGE

        if (news.image_url) {

            const image = document.createElement('img');

            image.className = 'news-image';
            image.src = news.image_url;
            image.alt = news.title || 'News image';
            image.loading = 'lazy';

            // Open full-size image on click

            image.addEventListener('click', function() {

                openImageViewer(
                    news.image_url,
                    news.title
                );

            });

            // Hide image if it cannot be loaded

            image.addEventListener('error', function() {
                image.remove();
            });

            card.appendChild(image);

        }


        // CONTENT

        const content = document.createElement('div');
        content.className = 'news-content';
        content.textContent = news.content || '';

        card.appendChild(content);


        newsList.appendChild(card);

    });

}


// ========================================
// LOAD NEWS FROM SUPABASE
// ========================================

async function loadNews() {

    if (isLoadingNews) {
        return;
    }

    isLoadingNews = true;

    try {

        const { data, error } = await db
            .from('news')
            .select('id, title, content, image_url, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        displayNews(data);

    } catch (error) {

        console.error('Error loading news from Supabase:', error);

        newsList.replaceChildren();

        const message = document.createElement('div');
        message.className = 'news-status';
        message.textContent = 'Could not load news: ' + error.message;

        const retryButton = document.createElement('button');

        retryButton.textContent = 'TRY AGAIN';
        retryButton.style.marginTop = '12px';
        retryButton.style.padding = '8px 14px';
        retryButton.style.background = '#344b60';
        retryButton.style.color = 'white';
        retryButton.style.border = '1px solid #526a80';
        retryButton.style.cursor = 'pointer';

        retryButton.addEventListener('click', loadNews);

        message.appendChild(document.createElement('br'));
        message.appendChild(retryButton);

        newsList.appendChild(message);

    } finally {

        isLoadingNews = false;

    }

}


// ========================================
// INITIAL NEWS LOAD
// ========================================

loadNews();


// ========================================
// REALTIME NEWS UPDATES
// ========================================

db
    .channel('public-news-feed')
    .on(
        'postgres_changes',
        {
            event: '*',
            schema: 'public',
            table: 'news'
        },
        function() {
            loadNews();
        }
    )
    .subscribe();


// Backup refresh every 60 seconds

setInterval(loadNews, 60000);
