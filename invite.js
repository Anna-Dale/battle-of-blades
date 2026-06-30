const InviteManager = {
  generateLink(playerName) {
    const base = window.location.href.split('?')[0];
    const url = new URL(base);
    url.searchParams.set('play', '1');
    if (playerName) url.searchParams.set('from', encodeURIComponent(playerName));
    return url.toString();
  },

  getInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
      invited: params.get('play') === '1',
      from: params.get('from') ? decodeURIComponent(params.get('from')) : null
    };
  }
};
