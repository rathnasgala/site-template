const KEY = 'gala.prism.session.v1';

/** Builds the synchronous, page-specific canonical-arrival redirect. */
export function prismSessionBootstrap(post, configurations) {
  if (!post?.id || !post?.language || !post?.prismSourceHash || configurations.length === 0) return '';
  const available = configurations.map((configuration) => ({
    configurationId: configuration.configurationId,
    sourceRevisionHash: configuration.sourceRevisionHash,
    pageUrl: configuration.pageUrl,
  }));
  const facts = JSON.stringify({
    articleId: post.id,
    language: post.language,
    sourceRevisionHash: post.prismSourceHash,
    available,
  }).replaceAll('<', '\\u003c');
  return `(function(){try{var k='${KEY}',p=${facts},r=sessionStorage.getItem(k);if(!r)return;var s=JSON.parse(r),c=p.available.find(function(x){return x.configurationId===s.configurationId&&x.sourceRevisionHash===s.sourceRevisionHash});if(s.articleId!==p.articleId||s.language!==p.language||s.sourceRevisionHash!==p.sourceRevisionHash||!c){sessionStorage.removeItem(k);return}var u=new URL(c.pageUrl,location.href);if(u.origin===location.origin)location.replace(u.href)}catch(e){try{sessionStorage.removeItem('${KEY}')}catch(x){}}})();`;
}

export { KEY as PRISM_SESSION_KEY };
