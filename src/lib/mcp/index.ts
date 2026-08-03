import { auth, defineMcp } from "@lovable.dev/mcp-js";

import searchFilms from "./tools/search-films";
import getFilm from "./tools/get-film";
import listWatchlist from "./tools/list-watchlist";
import addToWatchlist from "./tools/add-to-watchlist";
import removeFromWatchlist from "./tools/remove-from-watchlist";
import listContinueWatching from "./tools/list-continue-watching";
import listMyTickets from "./tools/list-my-tickets";

// The OAuth issuer must be the direct Supabase host: the published SUPABASE_URL
// is the proxy form, which fails RFC 8414 issuer matching.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "iran",
  title: "IRAN",
  version: "0.1.0",
  instructions:
    "Tools for IRAN (ir.show), a streaming service for Iranian films and walking tours. Use `search_films` and `get_film` to explore the catalog, `list_watchlist` / `add_to_watchlist` / `remove_from_watchlist` to manage the member's saved films, `list_continue_watching` for in-progress playback, and `list_my_tickets` for purchased tickets. All tools act as the signed-in member.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchFilms,
    getFilm,
    listWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    listContinueWatching,
    listMyTickets,
  ],
});
