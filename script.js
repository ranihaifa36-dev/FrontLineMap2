
// ========================================
// SUPABASE CONFIGURATION
// ========================================

const SUPABASE_URL = 'https://qeiospslkykwdrbgflzb.supabase.co';

const SUPABASE_KEY = 'sb_publishable_HuG7VQQDL5hbhM3zwvOJIA_w0sE5H1V';

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ========================================
// CREATE MAP
// ========================================

const map = L.map('map').setView([33.8, 35.8], 8);


// Add geographic background
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

        // Date
        const date = document.createElement('div');
        date.className = 'news-date';
        date.textContent = formatNewsDate(news.created_at);

        // Title
        const title = document.createElement('h3');
        title.className = 'news-title';
        title.textContent = news.title || 'Untitled news';

        card.appendChild(date);
        card.appendChild(title);

        // Optional image
        if (news.image_url) {

            const image = document.createElement('img');

            image.className = 'news-image';
            image.src = news.image_url;
            image.alt = news.title || 'News image';
            image.loading = 'lazy';

            image.addEventListener('error', function() {
                image.remove();
            });

            card.appendChild(image);
        }

        // Content
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
// AUTOMATIC NEWS UPDATES
// ========================================

// Realtime updates when Supabase Realtime is enabled.

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


// Backup refresh every 60 seconds.
// This also works if Realtime is not enabled.

setInterval(loadNews, 60000);
