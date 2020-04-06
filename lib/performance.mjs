/* Node/Browser-agnostic web platform Performance interface (W3C spec)
 *
 * High-resolution timers and performance "timeline entry" APIs for
 * time-profiling arbitrary JavaScript (without all the hacks involved
 * with a userland solution like benchmark.js).
 *
 * MDN [0] documents the API mirrored in Node.js [1], both intended to
 * more-or-less compatibly follow the spec for high-resolution timestamps
 * [2] and the Performance Timeline API [3] defined by the W3C as a suite
 * of performance measurement tools recommended for implementation in web
 * platform software (browsers, node.js, et cetera).
 *
 * 0: MDN  https://developer.mozilla.org/en-US/docs/Web/API/Performance
 * 1: Node https://nodejs.org/api/perf_hooks.html
 * 2: W3C  https://www.w3.org/TR/hr-time-2/#sec-performance
 * 3: W3C  https://w3c.github.io/performance-timeline/
 *
 */
/*
 * An instance of Performance is available in browsers as `performance` on
 * the global `window` object. As usual, Node introduces a little wart by
 * changing how the interface is accessed. In Node, `performance` is in
 * the `perf_hooks` module, rather than a global.
 *
 * Apparently, the reason a `performance` global is not exposed in Node.js
 * is because: "the convention is exposing a Web API to global [sic] when
 * it is no longer experimental." This quote taken from an open PR [0] to
 * nodejs/node which proposes the promotion of perf_hooks.performance to a
 * global, to align with the corresponding browser API. Another comment on
 * the same PR states: "the current implementation is not fully compatible
 * with the browser version" -- again, emphasizing the experimental
 * stability of the Node.js implementation of the API.
 *
 * Disappointingly, the API is marked as "stable" (NOT experimental) in
 * the Node.js API reference documentation [1].
 *
 * Either:
 *   (a) The API is not stable, otherwise there would be a global
 *   (b) The API is stable, there's no global, there may never be one, and
 *       the PR commenters are pandering to a potential contributor to
 *       make nice and be friendly.
 *
 * In the case of (a), the documentation is in error, and that's a real
 * shame since it's supposed to be the official record of the stability of
 * an API (whoopsy). In the case of (b), the missing global reference
 * implies disagreement between maintainers providing little assurance
 * that a global will ever be exposed, meaning we're bound by fate to hell
 * one way or another. For what it's worth, I think option (b) is more
 * likely: maintainers probably have compelling, pedantic, reasons why
 * they think adding a global to the Node.js runtime is a Bad Idea (tm),
 * and I bet they all feel very smart and their bikeshed has an orgasmic
 * blend of white, gray, off-white, ashen, burgeosie-pearl paint on it.
 *
 * So, anyway, we now resort to good, old-fashioned browser/server
 * bait-and-switch tactics, while still satisfying strict-mode to follow
 * the ECMAScript Module parse rules, as we shamelessly hoodwink the
 * innocent babe who thinks strict parsing can save you from the worst of
 * all terrible fates. There is worse, still, beyond imagining...
 *
 * 0: https://github.com/nodejs/node/issues/28635
 * 1: https://nodejs.org/api/perf_hooks.html#perf_hooks_class_performance
 */
export function inject (dependent) {
  if (typeof performance !== 'undefined') {
    return Promise.resolve(dependent({ performance: eval(`performance`) }))
  } else {
    return import('perf_hooks').then(dependent)
  }
}
