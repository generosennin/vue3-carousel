/**
 * Vue 3 Carousel 0.1.27
 * (c) 2021
 * @license MIT
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vue')) :
  typeof define === 'function' && define.amd ? define(['exports', 'vue'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VueCarousel = {}, global.Vue));
}(this, (function (exports, vue) { 'use strict';

  function counterFactory() {
      return new Proxy({ value: 0, read: 0 }, {
          get(obj, prop) {
              if (!(prop in obj))
                  return 0;
              if (prop === 'read') {
                  return obj[prop];
              }
              return obj[prop]++;
          },
          set(obj, prop, value) {
              obj[prop] = Math.max(value, 0);
              return true;
          },
      });
  }

  /**
   * return a debounced version of the function
   * @param fn
   * @param delay
   */
  function debounce(fn, delay) {
      let timerId;
      return function (...args) {
          if (timerId) {
              clearTimeout(timerId);
          }
          timerId = setTimeout(() => {
              fn(...args);
              timerId = null;
          }, delay);
      };
  }
  /**
   * return a throttle version of the function
   * Throttling
   *
   */
  function throttle(fn, limit) {
      let inThrottle;
      return function (...args) {
          const self = this;
          if (!inThrottle) {
              fn.apply(self, args);
              inThrottle = true;
              setTimeout(() => (inThrottle = false), limit);
          }
      };
  }
  function getSlides(vNode) {
      var _a, _b, _c;
      // Return empty array if there's any node
      if (!vNode)
          return [];
      // Check if the Slides components are added directly without v-for (#72)
      if (((_b = (_a = vNode[0]) === null || _a === void 0 ? void 0 : _a.type) === null || _b === void 0 ? void 0 : _b.name) === 'CarouselSlide')
          return vNode;
      return ((_c = vNode[0]) === null || _c === void 0 ? void 0 : _c.children) || [];
  }

  var Carousel = vue.defineComponent({
      name: 'Carousel',
      props: {
          // count of items to showed per view
          itemsToShow: {
              default: 1,
              type: Number,
          },
          // count of items to be scrolled
          itemsToScroll: {
              default: 1,
              type: Number,
          },
          // control infinite scrolling mode
          wrapAround: {
              default: false,
              type: Boolean,
          },
          // control snap position alignment
          snapAlign: {
              default: 'center',
              validator(value) {
                  // The value must match one of these strings
                  return ['start', 'end', 'center'].includes(value);
              },
          },
          // sliding transition time in ms
          transition: {
              default: 300,
              type: Number,
          },
          // an object to pass all settings
          settings: {
              default() {
                  return {};
              },
              type: Object,
          },
          // an object to store breakpoints
          breakpoints: {
              default: null,
              type: Object,
          },
          // time to auto advance slides in ms
          autoplay: {
              default: 0,
              type: Number,
          },
          // pause autoplay when mouse hover over the carousel
          pauseAutoplayOnHover: {
              default: false,
              type: Boolean,
          },
          // slide number number of initial slide
          modelValue: {
              default: undefined,
              type: Number,
          },
          // toggle mouse dragging.
          mouseDrag: {
              default: true,
              type: Boolean,
          },
          // toggle mouse dragging.
          touchDrag: {
              default: true,
              type: Boolean,
          },
      },
      setup(props, { slots, emit }) {
          var _a;
          const root = vue.ref(null);
          const slides = vue.ref([]);
          const slidesBuffer = vue.ref([]);
          const slideWidth = vue.ref(0);
          const slidesCount = vue.ref(1);
          const paginationCount = vue.ref(1);
          const slidesCounter = counterFactory();
          // current config
          const config = vue.reactive({});
          // generate carousel configs
          let defaultConfig = {};
          let breakpoints = vue.ref({});
          initDefaultConfigs();
          updateConfig();
          // Update the carousel on props change
          vue.watch(props, () => {
              initDefaultConfigs();
              updateConfig();
              updateSlidesData();
              updateSlideWidth();
          });
          // slides
          const currentSlide = vue.ref((_a = config.currentSlide) !== null && _a !== void 0 ? _a : 0);
          const prevSlide = vue.ref(0);
          const middleSlide = vue.ref(0);
          vue.provide('config', config);
          vue.provide('slidesBuffer', slidesBuffer);
          vue.provide('slidesCount', slidesCount);
          vue.provide('currentSlide', currentSlide);
          vue.provide('slidesCounter', slidesCounter);
          vue.provide('paginationCount', paginationCount);
          /**
           * Configs
           */
          function initDefaultConfigs() {
              // generate carousel configs
              defaultConfig = Object.assign(Object.assign(Object.assign({}, props), props.settings), { currentSlide: props.modelValue });
              // Set breakpoints
              breakpoints = vue.ref(Object.assign({}, defaultConfig.breakpoints));
              // remove extra values
              defaultConfig = Object.assign(Object.assign({}, defaultConfig), { settings: undefined, breakpoints: undefined });
          }
          function updateConfig() {
              const breakpointsArray = Object.keys(breakpoints.value)
                  .map((key) => Number(key))
                  .sort((a, b) => +b - +a);
              let newConfig = Object.assign({}, defaultConfig);
              breakpointsArray.some((breakpoint) => {
                  const isMatched = window.matchMedia(`(min-width: ${breakpoint}px)`).matches;
                  if (isMatched) {
                      newConfig = Object.assign(Object.assign({}, newConfig), breakpoints.value[breakpoint]);
                      return true;
                  }
                  return false;
              });
              Object.keys(newConfig).forEach((key) => (config[key] = newConfig[key]));
          }
          const handleWindowResize = debounce(() => {
              if (breakpoints.value) {
                  updateConfig();
                  updateSlidesData();
              }
              updateSlideWidth();
          }, 16);
          /**
           * Setup functions
           */
          function updateSlideWidth() {
              if (!root.value)
                  return;
              const rect = root.value.getBoundingClientRect();
              slideWidth.value = rect.width / config.itemsToShow;
          }
          function updateSlidesData() {
              paginationCount.value = slides.value.length;
              slidesCount.value = slides.value.length;
              middleSlide.value = Math.ceil((slidesCount.value - 1) / 2);
              currentSlide.value = Math.max(0, currentSlide.value);
          }
          function updateSlidesBuffer() {
              const slidesArray = [...Array(slidesCount.value).keys()];
              if (config.wrapAround) {
                  const shifts = currentSlide.value + middleSlide.value + 1;
                  for (let i = 0; i < shifts; i++) {
                      slidesArray.push(Number(slidesArray.shift()));
                  }
              }
              slidesBuffer.value = slidesArray;
          }
          vue.onMounted(() => {
              if (breakpoints.value) {
                  updateConfig();
                  updateSlidesData();
              }
              updateSlideWidth();
              if (config.autoplay > 0)
                  initializeAutoplay();
              // @ts-ignore
              window.addEventListener('resize', handleWindowResize, { passive: true });
          });
          /**
           * Carousel Event listeners
           */
          let isTouch = false;
          const startPosition = { x: 0, y: 0 };
          const endPosition = { x: 0, y: 0 };
          const dragged = vue.reactive({ x: 0, y: 0 });
          const isDragging = vue.ref(false);
          const isHover = vue.ref(false);
          const handleMouseEnter = () => {
              isHover.value = true;
          };
          const handleMouseLeave = () => {
              isHover.value = false;
          };
          const handleDrag = throttle((event) => {
              if (!isTouch)
                  event.preventDefault();
              endPosition.x = isTouch ? event.touches[0].clientX : event.clientX;
              endPosition.y = isTouch ? event.touches[0].clientY : event.clientY;
              const deltaX = endPosition.x - startPosition.x;
              const deltaY = endPosition.y - startPosition.y;
              dragged.y = deltaY;
              dragged.x = deltaX;
          }, 16);
          function handleDragStart(event) {
              if (!isTouch)
                  event.preventDefault();
              isTouch = event.type === 'touchstart';
              if ((!isTouch && event.button !== 0) || isSliding.value) {
                  return;
              }
              isDragging.value = true;
              startPosition.x = isTouch ? event.touches[0].clientX : event.clientX;
              startPosition.y = isTouch ? event.touches[0].clientY : event.clientY;
              // @ts-ignore
              document.addEventListener(isTouch ? 'touchmove' : 'mousemove', handleDrag);
              document.addEventListener(isTouch ? 'touchend' : 'mouseup', handleDragEnd);
          }
          function handleDragEnd() {
              isDragging.value = false;
              const tolerance = Math.sign(dragged.x) * 0.4;
              const draggedSlides = Math.round(dragged.x / slideWidth.value + tolerance);
              let newSlide = currentSlide.value - draggedSlides;
              if (!config.wrapAround)
                  newSlide = Math.max(Math.min(newSlide, slidesCount.value - 1), 0);
              slideTo(newSlide);
              dragged.x = 0;
              dragged.y = 0;
              // @ts-ignore
              document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', handleDrag);
              document.removeEventListener(isTouch ? 'touchend' : 'mouseup', handleDragEnd);
          }
          /**
           * Autoplay
           */
          function initializeAutoplay() {
              setInterval(() => {
                  if (config.pauseAutoplayOnHover && isHover.value) {
                      return;
                  }
                  next();
              }, config.autoplay);
          }
          /**
           * Navigation function
           */
          const isSliding = vue.ref(false);
          function slideTo(slideIndex, mute = false) {
              if (currentSlide.value === slideIndex || isSliding.value) {
                  return;
              }
              // Wrap slide index
              const lastSlideIndex = slidesCount.value - 1;
              if (slideIndex > lastSlideIndex) {
                  return slideTo(slideIndex - slidesCount.value);
              }
              if (slideIndex < 0) {
                  return slideTo(slideIndex + slidesCount.value);
              }
              isSliding.value = true;
              prevSlide.value = currentSlide.value;
              currentSlide.value = slideIndex;
              if (!mute) {
                  emit('update:modelValue', currentSlide.value);
              }
              console.log('update');
              emit('current', currentSlide.value);
              console.log(currentSlide.value);
              setTimeout(() => {
                  if (config.wrapAround)
                      updateSlidesBuffer();
                  isSliding.value = false;
              }, config.transition);
          }
          function next() {
              let nextSlide = currentSlide.value + config.itemsToScroll;
              if (!config.wrapAround) {
                  nextSlide = Math.min(nextSlide, paginationCount.value - 1);
              }
              slideTo(nextSlide);
          }
          function prev() {
              let prevSlide = currentSlide.value - config.itemsToScroll;
              if (!config.wrapAround) {
                  prevSlide = Math.max(prevSlide, 0);
              }
              slideTo(prevSlide);
          }
          const nav = { slideTo, next, prev };
          vue.provide('nav', nav);
          /**
           * Track style
           */
          const slidesToScroll = vue.computed(() => {
              let output = slidesBuffer.value.indexOf(currentSlide.value);
              if (config.snapAlign === 'center') {
                  output -= (config.itemsToShow - 1) / 2;
              }
              if (config.snapAlign === 'end') {
                  output -= config.itemsToShow - 1;
              }
              if (!config.wrapAround) {
                  const max = slidesCount.value - config.itemsToShow;
                  const min = 0;
                  output = Math.max(Math.min(output, max), min);
              }
              return output;
          });
          vue.provide('slidesToScroll', slidesToScroll);
          const trackStyle = vue.computed(() => {
              const xScroll = dragged.x - slidesToScroll.value * slideWidth.value;
              return {
                  transform: `translateX(${xScroll}px)`,
                  transition: `${isSliding.value ? config.transition : 0}ms`,
              };
          });
          const slotsProps = vue.reactive({ slideWidth, slidesCount, currentSlide });
          const slotSlides = slots.default || slots.slides;
          const slotAddons = slots.addons;
          vue.watchEffect(() => {
              // Handel when slides added/removed
              const needToUpdate = slidesCount.value !== slides.value.length;
              const currentSlideUpdated = props.modelValue !== undefined && currentSlide.value !== props.modelValue;
              if (currentSlideUpdated) {
                  slideTo(Number(props.modelValue), true);
              }
              if (needToUpdate) {
                  updateSlidesData();
                  updateSlidesBuffer();
              }
              if (slidesCounter.read) {
                  slidesCounter.value = slides.value.length - 1;
              }
          });
          updateSlidesBuffer();
          return () => {
              const slidesElements = getSlides(slotSlides === null || slotSlides === void 0 ? void 0 : slotSlides(slotsProps));
              const addonsElements = (slotAddons === null || slotAddons === void 0 ? void 0 : slotAddons(slotsProps)) || [];
              slides.value = slidesElements;
              // Bind slide order
              slidesElements.forEach((el, index) => (el.props.index = index));
              const trackEl = vue.h('ol', {
                  class: 'carousel__track',
                  style: trackStyle.value,
                  onMousedown: config.mouseDrag ? handleDragStart : null,
                  onTouchstart: config.touchDrag ? handleDragStart : null,
              }, slidesElements);
              const viewPortEl = vue.h('div', { class: 'carousel__viewport' }, trackEl);
              return vue.h('section', {
                  ref: root,
                  class: 'carousel',
                  'aria-label': 'Gallery',
                  onMouseenter: handleMouseEnter,
                  onMouseleave: handleMouseLeave,
              }, [viewPortEl, addonsElements]);
          };
      },
  });

  const icons = {
      arrowUp: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
      arrowDown: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
      arrowRight: 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z',
      arrowLeft: 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z',
  };

  const Icon = (props) => {
      const iconName = props.name;
      if (!iconName || typeof iconName !== 'string') {
          return;
      }
      const path = icons[iconName];
      const pathEl = vue.h('path', { d: path });
      props.title || iconName;
      const titleEl = vue.h('title', null, iconName);
      const circleEl = vue.h('circle', {
          cx: 40,
          cy: 40,
          r: 20
      });
      return vue.h('svg', {
          class: 'carousel__icon',
          viewBox: '0 0 24 24',
          role: 'img',
      }, [titleEl, pathEl, circleEl]);
  };
  Icon.props = { name: String, title: String };

  const Navigation = (props, { slots, attrs }) => {
      const { next: slotNext, prev: slotPrev } = slots;
      const nav = vue.inject('nav', {});
      const prevButton = vue.h('button', { type: 'button', class: ['carousel__prev', attrs === null || attrs === void 0 ? void 0 : attrs.class], onClick: nav.prev }, (slotPrev === null || slotPrev === void 0 ? void 0 : slotPrev()) || vue.h(Icon, { name: 'arrowLeft' }));
      const nextButton = vue.h('button', { type: 'button', class: ['carousel__next', attrs === null || attrs === void 0 ? void 0 : attrs.class], onClick: nav.next }, (slotNext === null || slotNext === void 0 ? void 0 : slotNext()) || vue.h(Icon, { name: 'arrowRight' }));
      return [prevButton, nextButton];
  };

  var Slide = vue.defineComponent({
      name: 'CarouselSlide',
      props: {
          index: {
              type: Number,
              default: 1,
          },
      },
      setup(props, { slots }) {
          const config = vue.inject('config', vue.reactive({}));
          const slidesBuffer = vue.inject('slidesBuffer', vue.ref([]));
          const slidesCounter = vue.inject('slidesCounter');
          const currentSlide = vue.inject('currentSlide', vue.ref(0));
          const slidesToScroll = vue.inject('slidesToScroll', vue.ref(0));
          const slideOrder = slidesCounter.value;
          const wrapOrder = vue.ref(slideOrder);
          if (config.wrapAround) {
              updateOrder();
              vue.watchEffect(updateOrder);
          }
          function updateOrder() {
              wrapOrder.value = slidesBuffer.value.indexOf(slideOrder);
          }
          const slideStyle = vue.computed(() => {
              const items = config.itemsToShow;
              const width = `${(1 / items) * 100}%`;
              return {
                  width,
                  order: wrapOrder.value.toString(),
              };
          });
          const isActive = () => props.index === currentSlide.value;
          const isVisible = () => {
              const min = Math.ceil(slidesToScroll.value);
              const max = Math.floor(slidesToScroll.value + config.itemsToShow);
              const current = slidesBuffer.value.slice(min, max);
              return current.includes(props.index);
          };
          const isPrev = () => props.index === slidesBuffer.value[Math.ceil(slidesToScroll.value) - 1];
          const isNext = () => props.index ===
              slidesBuffer.value[Math.floor(slidesToScroll.value + config.itemsToShow)];
          return () => {
              var _a;
              return vue.h('li', {
                  style: slideStyle.value,
                  class: {
                      carousel__slide: true,
                      'carousel__slide--active': isActive(),
                      'carousel__slide--visible': isVisible(),
                      'carousel__slide--prev': isPrev(),
                      'carousel__slide--next': isNext(),
                  },
              }, (_a = slots.default) === null || _a === void 0 ? void 0 : _a.call(slots));
          };
      },
  });

  const Pagination = () => {
      vue.inject('slidesCount', vue.ref(1));
      const paginationCount = vue.inject('paginationCount', vue.ref(1));
      const currentSlide = vue.inject('currentSlide', vue.ref(1));
      const nav = vue.inject('nav', {});
      function handleButtonClick(slideNumber) {
          nav.slideTo(slideNumber);
      }
      const children = [];
      for (let slide = 0; slide < paginationCount.value; slide++) {
          const button = vue.h('button', {
              type: 'button',
              class: {
                  'carousel__pagination-button': true,
                  'carousel__pagination-button--active': currentSlide.value === slide,
              },
              onClick: () => handleButtonClick(slide),
          });
          const item = vue.h('li', { class: 'carousel__pagination-item', key: slide }, button);
          children.push(item);
      }
      return vue.h('ol', { class: 'carousel__pagination' }, children);
  };

  exports.Carousel = Carousel;
  exports.Icon = Icon;
  exports.Navigation = Navigation;
  exports.Pagination = Pagination;
  exports.Slide = Slide;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
