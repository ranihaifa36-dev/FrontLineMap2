
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

// Minimum zoom prevents excessive zooming out.
const map = L.map('map', {
    minZoom: 3,
    maxZoom: 19,
    maxBounds: [
        [-85, -180],
        [85, 180]
    ],
    maxBoundsViscosity: 1.0
}).setView([33.8, 35.8], 8);


// noWrap prevents repeated copies of the world.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// ========================================
// FRONTLINE DATE ARCHIVE
// ========================================

const mapDateSelect = document.getElementById('map-date-select');
const mapDateLabel = document.getElementById('map-date-label');
const mapArchiveStatus = document.getElementById('map-archive-status');

let frontlineLayer = null;
let savedMapVersions = [];

function formatMapDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showMapArchiveStatus(message) {
    if (mapArchiveStatus) {
        mapArchiveStatus.textContent = message;
    }
}

function renderFrontline(data) {
    if (frontlineLayer) {
        map.removeLayer(frontlineLayer);
    }

    frontlineLayer = L.geoJSON(data, {
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

    // IMPORTANT:
    // Do not use fitBounds here.
    // The map position and zoom must remain unchanged
    // when switching between archived dates.
}

async function showSelectedMap() {
    const selected = savedMapVersions.find(
        item => item.id === mapDateSelect.value
    );

    if (!selected) return;

    showMapArchiveStatus('Loading selected map...');
    mapDateSelect.disabled = true;

    try {
        const { data, error } = await db.storage
            .from('frontline-maps')
            .download(selected.storage_path);

        if (error) throw error;

        const geojson = JSON.parse(await data.text());

        if (
            !geojson ||
            geojson.type !== 'FeatureCollection' ||
            !Array.isArray(geojson.features)
        ) {
            throw new Error(
                'This file is not a valid GeoJSON FeatureCollection.'
            );
        }

        // Save the current map position and zoom.
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();

        // Replace only the frontline layer.
        renderFrontline(geojson);

        // Restore the exact same map position and zoom.
        map.setView(currentCenter, currentZoom, {
            animate: false
        });

        mapDateLabel.textContent =
            formatMapDate(selected.map_date);

        showMapArchiveStatus(
            `Showing ${formatMapDate(selected.map_date)}`
        );

    } catch (error) {
        console.error(
            'Could not load archived frontline map:',
            error
        );

        showMapArchiveStatus(
            'Could not load this map: ' + error.message
        );

    } finally {
        mapDateSelect.disabled =
            savedMapVersions.length === 0;
    }
}

async function loadFrontlineArchive() {
    try {
        const { data, error } = await db
            .from('frontline_maps')
            .select('id, map_date, title, storage_path')
            .order('map_date', { ascending: false });

        if (error) throw error;

        savedMapVersions = data || [];

        mapDateSelect.replaceChildren();

        if (savedMapVersions.length === 0) {
            mapDateLabel.textContent = 'No map versions yet';

            showMapArchiveStatus(
                'Add map versions in the Admin panel.'
            );

            mapDateSelect.disabled = true;

            const option = document.createElement('option');
            option.textContent = 'No saved dates';

            mapDateSelect.appendChild(option);

            return;
        }

        savedMapVersions.forEach(version => {
            const option = document.createElement('option');

            option.value = version.id;
            option.textContent = formatMapDate(version.map_date);

            mapDateSelect.appendChild(option);
        });

        // Newest map is first because the query is descending.
        mapDateSelect.value = savedMapVersions[0].id;

        mapDateSelect.disabled = false;

        await showSelectedMap();

    } catch (error) {
        console.error(
            'Error loading frontline archive:',
            error
        );

        mapDateLabel.textContent = 'Map archive unavailable';

        showMapArchiveStatus(
            'Could not load map dates: ' + error.message
        );

        mapDateSelect.disabled = true;
    }
}

mapDateSelect.addEventListener('change', showSelectedMap);

loadFrontlineArchive();


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
lightboxHint.textContent =
    'Press ESC or click outside the image to close';

lightbox.appendChild(lightboxImage);
lightbox.appendChild(closeButton);
lightbox.appendChild(lightboxHint);

document.body.appendChild(lightbox);


function openImageViewer(src, alt) {
    lightboxImage.src = src;
    lightboxImage.alt = alt || 'News image';

    lightbox.classList.add('active');

    document.body.style.overflow = 'hidden';

    closeButton.focus();
}

function closeImageViewer() {
    lightbox.classList.remove('active');

    lightboxImage.removeAttribute('src');

    document.body.style.overflow = '';
}

closeButton.addEventListener('click', closeImageViewer);

lightbox.addEventListener('click', function(event) {
    if (
        event.target === lightbox ||
        event.target === lightboxHint
    ) {
        closeImageViewer();
    }
});

document.addEventListener('keydown', function(event) {
    if (
        event.key === 'Escape' &&
        lightbox.classList.contains('active')
    ) {
        closeImageViewer();
    }
});


// ========================================
// NEWS FEED - PAGINATION
// ========================================

const newsList = document.getElementById('news-list');

const NEWS_PAGE_SIZE = 10;

let isLoadingNews = false;
let currentNewsOffset = 0;
let hasMoreNews = true;
let newsRefreshInProgress = false;


// ========================================
// NEWS STATUS
// ========================================

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
// CREATE NEWS CARD
// ========================================

function createNewsCard(news) {
    const card = document.createElement('article');

    card.className = 'news-card';
    card.dataset.newsId = news.id;


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

        image.addEventListener('click', function() {
            openImageViewer(
                news.image_url,
                news.title
            );
        });

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

    return card;
}


// ========================================
// LOAD MORE BUTTON
// ========================================

function createLoadMoreButton() {
    const wrapper = document.createElement('div');

    wrapper.id = 'load-more-wrapper';
    wrapper.style.textAlign = 'center';
    wrapper.style.padding = '15px 5px';

    const button = document.createElement('button');

    button.id = 'load-more-news';
    button.type = 'button';
    button.textContent = 'LOAD MORE';

    button.style.padding = '11px 22px';
    button.style.background = '#252d36';
    button.style.color = '#e8edf2';
    button.style.border = '1px solid #48525e';
    button.style.borderRadius = '3px';
    button.style.fontSize = '10px';
    button.style.letterSpacing = '1px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', loadMoreNews);

    wrapper.appendChild(button);

    return wrapper;
}


// ========================================
// LOAD NEWS FROM SUPABASE
// ========================================

async function loadMoreNews() {
    if (isLoadingNews || !hasMoreNews) {
        return;
    }

    isLoadingNews = true;

    const existingButton =
        document.getElementById('load-more-wrapper');

    const button = existingButton
        ? existingButton.querySelector('button')
        : null;

    if (button) {
        button.disabled = true;
        button.textContent = 'LOADING...';
    }

    if (currentNewsOffset === 0) {
        showNewsStatus('Loading news...');
    }

    try {
        const start = currentNewsOffset;
        const end = start + NEWS_PAGE_SIZE - 1;

        const { data, error } = await db
            .from('news')
            .select('id, title, content, image_url, created_at')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(start, end);

        if (error) {
            throw error;
        }

        const newsItems = data || [];

        const oldStatus =
            newsList.querySelector('.news-status');

        if (oldStatus) {
            oldStatus.remove();
        }

        if (currentNewsOffset === 0 && newsItems.length === 0) {
            showNewsStatus('No news published yet.');
            hasMoreNews = false;
            return;
        }

        newsItems.forEach(news => {
            newsList.appendChild(createNewsCard(news));
        });

        currentNewsOffset += newsItems.length;

        hasMoreNews =
            newsItems.length === NEWS_PAGE_SIZE;

        const oldWrapper =
            document.getElementById('load-more-wrapper');

        if (oldWrapper) {
            oldWrapper.remove();
        }

        if (hasMoreNews) {
            newsList.appendChild(createLoadMoreButton());
        }

    } catch (error) {
        console.error(
            'Error loading news from Supabase:',
            error
        );

        if (currentNewsOffset === 0) {
            showNewsStatus(
                'Could not load news: ' + error.message
            );
        } else {
            const oldWrapper =
                document.getElementById('load-more-wrapper');

            if (oldWrapper) {
                oldWrapper.remove();
            }

            const retryWrapper = createLoadMoreButton();

            const retryButton =
                retryWrapper.querySelector('button');

            retryButton.textContent = 'RETRY LOADING';

            newsList.appendChild(retryWrapper);
        }

    } finally {
        isLoadingNews = false;
    }
}


// ========================================
// REFRESH NEWEST NEWS
// ========================================

async function refreshNews() {
    if (newsRefreshInProgress || isLoadingNews) {
        return;
    }

    newsRefreshInProgress = true;

    try {
        const { data, error } = await db
            .from('news')
            .select('id, title, content, image_url, created_at')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(NEWS_PAGE_SIZE);

        if (error) throw error;

        const newestItems = data || [];

        if (currentNewsOffset === 0) {
            newsList.replaceChildren();

            if (newestItems.length === 0) {
                showNewsStatus('No news published yet.');
                hasMoreNews = false;
                return;
            }

            newestItems.forEach(news => {
                newsList.appendChild(createNewsCard(news));
            });

            currentNewsOffset = newestItems.length;
            hasMoreNews =
                newestItems.length === NEWS_PAGE_SIZE;

            if (hasMoreNews) {
                newsList.appendChild(createLoadMoreButton());
            }

            return;
        }

        const existingIds = new Set(
            Array.from(
                newsList.querySelectorAll('.news-card')
            ).map(card => card.dataset.newsId)
        );

        const newItems = newestItems.filter(
            news => !existingIds.has(String(news.id))
        );

        if (newItems.length > 0) {
            const firstCard =
                newsList.querySelector('.news-card');

            newItems.reverse().forEach(news => {
                const card = createNewsCard(news);

                if (firstCard) {
                    newsList.insertBefore(card, firstCard);
                } else {
                    newsList.prepend(card);
                }
            });

            currentNewsOffset += newItems.length;
        }

    } catch (error) {
        console.error('Could not refresh news:', error);

    } finally {
        newsRefreshInProgress = false;
    }
}


// ========================================
// INITIAL NEWS LOAD
// ========================================

loadMoreNews();


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
            refreshNews();
        }
    )
    .subscribe();


// Backup refresh every 60 seconds

setInterval(refreshNews, 60000);
