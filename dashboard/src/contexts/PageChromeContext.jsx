/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';

export const PageChromeContext = createContext({
  setPageRefreshConfig: () => {},
});

export function useDashboardPageChrome() {
  return useContext(PageChromeContext);
}

export default PageChromeContext;
