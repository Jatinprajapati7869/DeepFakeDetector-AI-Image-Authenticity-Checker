import { useCallback, useEffect, useReducer } from 'react';
import { api, ApiError } from '@/services/api';
import type { HistoryPage } from '@/types/analysis';

interface HistoryState {
  data: HistoryPage | null;
  page: number;
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: HistoryPage }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_PAGE'; payload: number };

const initialState: HistoryState = {
  data: null,
  page: 1,
  isLoading: false,
  error: null,
};

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    default:
      return state;
  }
}

export function useHistory() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchPage = useCallback(async (page: number) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await api.getHistory(page);
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load history.';
      dispatch({ type: 'FETCH_ERROR', payload: message });
    }
  }, []);

  useEffect(() => {
    fetchPage(state.page);
  }, [fetchPage, state.page]);

  const goToPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  return { ...state, goToPage, refresh: () => fetchPage(state.page) };
}
