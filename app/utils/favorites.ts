export interface FavoriteSpot {
	name: string;
	latitude: number;
	longitude: number;
	region: string;
	addedAt: string;
}

const FAVORITES_COOKIE_NAME = 'surf-finder-favourites';

export const getFavorites = (): FavoriteSpot[] => {
	if (typeof document === 'undefined') return [];
	
	const cookieValue = getCookie(FAVORITES_COOKIE_NAME);
	if (!cookieValue) return [];
	
	try {
		return JSON.parse(decodeURIComponent(cookieValue));
	} catch (error) {
		console.error('Error parsing favourites from cookie:', error);
		return [];
	}
};

export const saveFavorites = (favorites: FavoriteSpot[]): void => {
	if (typeof document === 'undefined') return;
	
	const cookieValue = encodeURIComponent(JSON.stringify(favorites));
	setCookie(FAVORITES_COOKIE_NAME, cookieValue, 365); // Expire in 1 year
};

export const addToFavorites = (spot: {
	name: string;
	latitude: number;
	longitude: number;
	region: string;
}): void => {
	const favorites = getFavorites();
	const isAlreadyFavorite = favorites.some(fav => fav.name === spot.name);
	
	if (!isAlreadyFavorite) {
		const favoriteSpot: FavoriteSpot = {
			...spot,
			addedAt: new Date().toISOString(),
		};
		favorites.push(favoriteSpot);
		saveFavorites(favorites);
	}
};

export const removeFromFavorites = (spotName: string): void => {
	const favorites = getFavorites();
	const updatedFavorites = favorites.filter(fav => fav.name !== spotName);
	saveFavorites(updatedFavorites);
};

export const isFavorite = (spotName: string): boolean => {
	const favorites = getFavorites();
	return favorites.some(fav => fav.name === spotName);
};

export const toggleFavorite = (spot: {
	name: string;
	latitude: number;
	longitude: number;
	region: string;
}): boolean => {
	if (isFavorite(spot.name)) {
		removeFromFavorites(spot.name);
		return false;
	} else {
		addToFavorites(spot);
		return true;
	}
};

function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	
	const nameEQ = name + "=";
	const ca = document.cookie.split(';');
	
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
}

function setCookie(name: string, value: string, days: number): void {
	if (typeof document === 'undefined') return;
	
	let expires = "";
	if (days) {
		const date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + value + expires + "; path=/";
}