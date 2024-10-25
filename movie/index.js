function clear_history() {
    localStorage.clear();
    document.querySelector("#watched tbody").innerHTML = "";
};

function add_result(item) {
    const results = document.querySelector("#search-results");

    if (results.innerHTML === "No results matching your query!") {
        results.innerHTML = "";
    };

    const card = document.createElement("div");
    card.classList.add("card");
    card.classList.add("d-flex");
    card.classList.add("m-3");
    card.classList.add("p-3");
    card.style.width = "100%";
    card.style.cursor = "pointer";

    const card_body = document.createElement("div");
    card_body.classList.add("card-body");

    const card_image = document.createElement("img");
    card_image.src = item.i;
    card_image.height = "150";
    card_image.width = "150";

    const card_title = document.createElement("h5");
    card_title.classList.add("card-title");
    card_title.innerHTML = item.l + ` (${item.y})`;

    const card_type = document.createElement("h6");
    card_type.classList.add("card-title-secondary");
    card_type.innerHTML = item.q === "feature" ? "Movie" : item.q;

    const card_text = document.createElement("p");
    card_text.classList.add("card-text");
    card_text.innerHTML = item.s;

    const card_id = document.createElement("p");
    card_id.classList.add("card-link");
    card_id.innerHTML = `IMDb ID: ${item.id}`;

    card.appendChild(card_image);
    card_body.appendChild(card_title);
    card_body.appendChild(card_type);
    card_body.appendChild(card_text);
    // card_body.appendChild(card_id);

    card.appendChild(card_body);

    card.addEventListener("click", function() {
        const idInput = document.querySelector("#id");
        idInput.value = item.id; // Fill the IMDb ID input
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll to the top
    
        // Highlight the input field
        idInput.classList.add("highlight"); // Add a highlight class
        setTimeout(() => idInput.classList.remove("highlight"), 2000); // Remove highlight after 2 seconds
    
        // Toggle fire effect on the submit button
        const submitButton = document.querySelector(".btn-primary");
        submitButton.classList.add("btn-fire"); // Add fire effect
        submitButton.innerHTML = "Nonton 🔥";
        setTimeout(() => {
            submitButton.classList.remove("btn-fire"); // Remove fire effect after 2 seconds
        }, 5000);
    });

    results.appendChild(card);
}

function search() {
    let q = document.querySelector("#q_field").value;
    q = q.replaceAll(" ", "_");
    //q = encodeURIComponent(q.trim());

    // console.log(q);

    const results_list = document.querySelector("#search-results");
    // console.log(results_list);

    // 2) Using jQuery (JSON-P)
    jQuery.ajax({
        url: `https://sg.media-imdb.com/suggests/f/${q}.json`,
        dataType: 'jsonp',
        cache: true,
        jsonp: false,
        jsonpCallback: `imdb$${q}`
    }).then(function(results) {

        results_list.innerHTML = "No results matching your query!";

        //console.log(results);

        for (let item in results.d) {
            item = results.d[item];
            // console.log(item.id);
            if (item.id.slice(0, 2) === 'tt') {
                add_result(item);
            }
        }
    });

}

function get_iframe() {
    iframe = document.querySelector('iframe');

    id = document.querySelector('#id').value;
    season = document.querySelector('#season').value;
    episode = document.querySelector('#episode').value;

    title_tag = document.querySelector('title');
    var title;

    if (season && episode) {
        iframe.src = `https://multiembed.mov/?video_id=${id}&s=${season}&e=${episode}`;
    } else {
        iframe.src = `https://multiembed.mov/?video_id=${id}`;
    }

    jQuery.ajax({
        url: `https://sg.media-imdb.com/suggests/f/${id}.json`,
        dataType: 'jsonp',
        cache: true,
        jsonp: false,
        jsonpCallback: `imdb$${id}`
    }).then(function(results) {
        for (var i = 0; i < results.d.length; i++) {
            if (results.d[i].id.slice(0, 2) === 'tt') {
                item = results.d[i];
                break;
            }
        }

        title = item.l;

        var watched = localStorage.getItem('watched');

        if (watched === null) {
            watched = [];
        } else {
            watched = JSON.parse(watched);
        }

        current = {
            id: id,
            title: title,
            season: season,
            episode: episode
        };

        watched.push(current);

        localStorage.setItem('watched', JSON.stringify(watched));

        update_watched();

        title_tag.innerHTML = `Nonton  - ${title}`;

    });

    history.pushState({}, null, `?id=${id}&s=${season}&e=${episode}`);

    iframe.scrollIntoView();

}

function update_watched() {
    var watched = localStorage.getItem('watched');
    if (watched === null) {
        watched = [];
    } else {
        watched = JSON.parse(watched);
    }

    console.log(watched);

    var table = document.querySelector('tbody');
    table.innerHTML = '';

    for (var i = 0; i < watched.length; i++) {
        var item = watched[watched.length - i - 1];

        // console.log(item);

        var row = document.createElement('tr');
        row.dataset.item = item;

        // row.role = 'a';
        row.setAttribute('data-href', `?id=${item.id}&s=${item.season}&e=${item.episode}`);

        row.style.cursor = 'pointer';

        var id = document.createElement('td');
        id.innerHTML = item.id;

        var title = document.createElement('td');
        title.innerHTML = item.title;

        var season = document.createElement('td');
        season.innerHTML = item.season;

        var episode = document.createElement('td');
        episode.innerHTML = item.episode;

        row.appendChild(id);
        row.appendChild(title);
        row.appendChild(season);
        row.appendChild(episode);

        table.appendChild(row);
    }

    var rows = document.querySelectorAll('tr');

    rows.forEach(row => {
        row.addEventListener('click', function() {
            window.location.href = row.dataset.href;
        });
    });
}

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('id')) {
    document.querySelector('#id').value = urlParams.get('id');
    document.querySelector('#season').value = urlParams.get('s');
    document.querySelector('#episode').value = urlParams.get('e');
    get_iframe();
}

update_watched();