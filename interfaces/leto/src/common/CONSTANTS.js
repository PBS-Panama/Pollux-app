// PBS Crewing Module — shared constants (R8)
// Everything else this file used to export (streaming server URL, subtitles,
// seek/popup durations, catalog paging, link categories, MIME signatures,
// external players) had zero real consumers left after R4-R7 — all of it
// belonged to screens/components already rewritten or deleted. ICON_FOR_TYPE
// is the one survivor: components/MetaItem/MetaItem.js still reads it
// (untouched, pending Rick's decision on Library).

const ICON_FOR_TYPE = new Map([
    ['movie', 'movies'],
    ['series', 'series'],
    ['channel', 'channels'],
    ['tv', 'tv'],
    ['book', 'ic_book'],
    ['game', 'ic_games'],
    ['music', 'ic_music'],
    ['adult', 'ic_adult'],
    ['radio', 'ic_radio'],
    ['podcast', 'ic_podcast'],
    ['other', 'movies'],
]);

module.exports = {
    ICON_FOR_TYPE,
};
