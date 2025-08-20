import { useState, useEffect, useCallback } from "react";
import { 
	getFavorites, 
	toggleFavorite, 
	isFavorite, 
	removeFromFavorites,
	type FavoriteSpot 
} from "../utils/favorites";

export interface UseFavoritesReturn {
	favorites: FavoriteSpot[];
	favoriteNames: string[];
	isSpotFavorited: (spotName: string) => boolean;
	toggleSpotFavorite: (spot: {
		name: string;
		latitude: number;
		longitude: number;
		region: string;
	}) => boolean;
	removeSpotFromFavorites: (spotName: string) => void;
	refreshFavorites: () => void;
}

/**
 * Custom hook for managing favourite surf spots
 */
export const useFavorites = (): UseFavoritesReturn => {
	const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
	const [favoriteNames, setFavoriteNames] = useState<string[]>([]);

	const refreshFavorites = useCallback(() => {
		const favoriteSpots = getFavorites();
		setFavorites(favoriteSpots);
		setFavoriteNames(favoriteSpots.map(spot => spot.name));
	}, []);

	useEffect(() => {
		refreshFavorites();
	}, [refreshFavorites]);

	const isSpotFavorited = useCallback((spotName: string): boolean => {
		return isFavorite(spotName);
	}, []);

	const toggleSpotFavorite = useCallback((spot: {
		name: string;
		latitude: number;
		longitude: number;
		region: string;
	}): boolean => {
		const newFavoriteStatus = toggleFavorite(spot);
		refreshFavorites();
		return newFavoriteStatus;
	}, [refreshFavorites]);

	const removeSpotFromFavorites = useCallback((spotName: string): void => {
		removeFromFavorites(spotName);
		refreshFavorites();
	}, [refreshFavorites]);

	return {
		favorites,
		favoriteNames,
		isSpotFavorited,
		toggleSpotFavorite,
		removeSpotFromFavorites,
		refreshFavorites,
	};
};

/**
 * Hook specifically for managing a single spot's favourite status
 */
export const useSpotFavorite = (spotName?: string) => {
	const [isFavorited, setIsFavorited] = useState(false);

	useEffect(() => {
		if (spotName) {
			const spotDisplayName = spotName.replace(/-/g, " ");
			setIsFavorited(isFavorite(spotDisplayName));
		}
	}, [spotName]);

	const toggle = useCallback((spot: {
		name: string;
		latitude: number;
		longitude: number;
		region: string;
	}) => {
		const newStatus = toggleFavorite(spot);
		setIsFavorited(newStatus);
		return newStatus;
	}, []);

	return {
		isFavorited,
		toggle,
	};
};