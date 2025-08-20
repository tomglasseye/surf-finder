import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("spots", "routes/spots.tsx"),
	route("forecast/:spotName", "routes/forecast.$spotName.tsx"),
	route("favourites", "routes/favourites.tsx"),
] satisfies RouteConfig;
