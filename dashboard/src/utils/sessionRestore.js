const buildSignedOutSessionPayload = () => ({
  success: true,
  data: null,
  meta: {
    refreshAvailable: false,
    sessionMode: 'signed_out',
  },
});

export function createSessionRestorer({
  probeRefreshAvailability,
  restoreWithRefresh,
  clearSessionToken = () => {},
} = {}) {
  return async function restoreSession() {
    const refreshAvailable = await probeRefreshAvailability();
    if (!refreshAvailable) {
      clearSessionToken();
      return buildSignedOutSessionPayload();
    }

    return restoreWithRefresh();
  };
}

export default createSessionRestorer;
