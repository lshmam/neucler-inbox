// Type declarations for Google Maps JavaScript API
// This extends the Window interface to include the google object

interface Window {
    google: typeof google;
}

declare namespace google.maps {
    namespace places {
        class PlacesService {
            constructor(attrContainer: HTMLDivElement | HTMLElement);
            getDetails(
                request: { placeId: string; fields?: string[] },
                callback: (
                    place: PlaceResult | null,
                    status: PlacesServiceStatus
                ) => void
            ): void;
        }

        interface PlaceResult {
            name?: string;
            formatted_address?: string;
            rating?: number;
            user_ratings_total?: number;
        }

        enum PlacesServiceStatus {
            OK = "OK",
            ZERO_RESULTS = "ZERO_RESULTS",
            INVALID_REQUEST = "INVALID_REQUEST",
            OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
            REQUEST_DENIED = "REQUEST_DENIED",
            UNKNOWN_ERROR = "UNKNOWN_ERROR",
        }
    }
}
