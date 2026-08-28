import { useState, useEffect, useCallback, type RefObject } from 'react';

export interface UseFullscreenOptions {
    /** Target a specific element ref instead of the entire document */
    targetRef?: RefObject<HTMLElement | null>;
    /** Options passed directly to requestFullscreen */
    navigationUI?: FullscreenNavigationUI;
}

export interface UseFullscreenReturn {
    isFullscreen: boolean;
    enterFullscreen: () => Promise<void>;
    exitFullscreen: () => Promise<void>;
    toggleFullscreen: () => Promise<void>;
    error: Error | null;
}

export function useFullscreen(options: UseFullscreenOptions = {}): UseFullscreenReturn {
    const { targetRef, navigationUI = 'auto' } = options;
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const getTargetElement = useCallback((): HTMLElement | null => {
        if (targetRef) {
            return targetRef.current;
        }
        return typeof document !== 'undefined' ? document.documentElement : null;
    }, [targetRef]);

    const enterFullscreen = useCallback(async (): Promise<void> => {
        const element = getTargetElement();
        if (!element) return;

        try {
            if (!document.fullscreenElement) {
                await element.requestFullscreen({ navigationUI });
                setError(null);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err));
            setError(errorObj);
            console.error(`Fullscreen request failed: ${errorObj.message}`);
        }
    }, [getTargetElement, navigationUI]);

    const exitFullscreen = useCallback(async (): Promise<void> => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                setError(null);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err));
            setError(errorObj);
            console.error(`Exit fullscreen failed: ${errorObj.message}`);
        }
    }, []);

    const toggleFullscreen = useCallback(async (): Promise<void> => {
        if (isFullscreen) {
            await exitFullscreen();
        } else {
            await enterFullscreen();
        }
    }, [isFullscreen, enterFullscreen, exitFullscreen]);

    useEffect(() => {
        const handleFullscreenChange = (): void => {
            const currentElement = getTargetElement();
            if (targetRef) {
                setIsFullscreen(document.fullscreenElement === currentElement);
            } else {
                setIsFullscreen(Boolean(document.fullscreenElement));
            }
        };

        const handleFullscreenError = (event: Event): void => {
            setError(new Error('Fullscreen request was denied or encountered an error.'));
            console.error('Fullscreen error event:', event);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('fullscreenerror', handleFullscreenError);

        handleFullscreenChange();

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('fullscreenerror', handleFullscreenError);
        };
    }, [getTargetElement, targetRef]);

    return {
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        toggleFullscreen,
        error,
    };
}