/* globals LazyLoader, Utils, OT, AnnotationAccPack, window */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-arrow-callback */
!(function(global) {
  'use strict'; // eslint-disable-line

  const dynamicOTLoad = false;
  let otPromise = Promise.resolve();

  const preReqSources = [];

  // in IE dynamic loading the library doesn't work. For the time being, as a stopgap measure,
  // loading it statically.
  if (dynamicOTLoad) {
    const OPENTOK_API = 'https://static.opentok.com/webrtc/v2/js/opentok.min.js';
    preReqSources.unshift(OPENTOK_API);
  }

  if (preReqSources.length) {
    otPromise = LazyLoader.load(preReqSources);
  }

  const toB64 = global.atob;
  const fromB64 = global.btoa;
  const compressor = global.LZString;
  const compress = compressor && compressor.compressToBase64.bind(compressor) || toB64;
  const uncompress = compressor && compressor.decompressFromBase64.bind(compressor) || fromB64;

  const MSG_MULTIPART = 'signal';
  const SIZE_MAX = 8000;

  const HEAD_SIZE =
        JSON.stringify({ _head: { id: 99, seq: 99, tot: 99 }, data: '' }).length;
  const USER_DATA_SIZE = SIZE_MAX - HEAD_SIZE;
  const LOG_LEVEL = global.LOG_LEVEL !== undefined ?
    global.LOG_LEVEL :
    Utils.MultiLevelLogger.DEFAULT_LEVELS.all;
  const logger = new Utils.MultiLevelLogger('OTHelper.js', LOG_LEVEL);

  const OTAsPromised = {};

  const otLoaded = otPromise.then(() => {
    const hasRequirements = OT.checkSystemRequirements();
    logger.trace('checkSystemRequirements:', hasRequirements);
    if (!hasRequirements) {
      OT.upgradeSystemRequirements();
      throw new Error('Unsupported browser, probably needs upgrade');
    }
    [
      'getDevices', 'initPublisher', 'connect',
    ].forEach(fn => OTAsPromised[fn] = Utils.promisify(OT[fn], OT));
  });

  // Done intentionally (to use string codes for our error codes)
  // so as to not overwrite existing OT library codes
  const PUB_SCREEN_ERROR_CODES = {
    accessDenied: 1500,
    extNotInstalled: 'OT0001',
    extNotRegistered: 'OT0002',
    notSupported: 'OT0003',
    errPublishingScreen: 'OT0004',
  };

  function getScreenShareCapability() {
    return new Promise((resolve, reject) => {
      OT.checkScreenSharingCapability((response) => {
        if (!response.supported) {
          reject({
            code: PUB_SCREEN_ERROR_CODES.notSupport,
            message: 'This browser does not support screen sharing.',
          });
        } else if (response.extensionRegistered === false) {
          reject({
            code: PUB_SCREEN_ERROR_CODES.extNotRegistered,
            message: 'This browser does not support screen sharing.',
          });
        } else if (response.extensionRequired !== undefined &&
                   response.extensionInstalled === false) {
          reject({
            code: PUB_SCREEN_ERROR_CODES.extNotInstalled,
            message: 'Please install the screen sharing extension and load your app over https.',
          });
        } else {
          resolve();
        }
      });
    });
  }

  function registerScreenShareExtension(aParams, version) {
    Object.keys(aParams).
      forEach(aKey => OT.registerScreenSharingExtension(aKey, aParams[aKey], version || 2));
  }

  const sendSignal = (() => {
    let messageOrder = 0;

    //
    // Multipart message sending proccess. this is expected to be the actual session
    //

    const sendSignalFn = function(aType, aMsgData, aTo) {
      let currentPosition = 0;

      function composeSegment(aMsgId, aSegmentOrder, aTotalSegments, aUsrMsg) {
        const signalData = {
          _head: {
            id: aMsgId,
            seq: aSegmentOrder,
            tot: aTotalSegments,
          },
          data: aUsrMsg.data ?
            aUsrMsg.data.substr(currentPosition, USER_DATA_SIZE) :
            '',
        };

        let signalContent = JSON.stringify(signalData);

        const overflow = JSON.stringify(signalContent).length - SIZE_MAX;
        if (overflow > 0) {
          signalData.data = aUsrMsg.data.substr(currentPosition, USER_DATA_SIZE - overflow);
          signalContent = JSON.stringify(signalData);
          currentPosition += USER_DATA_SIZE - overflow;
        } else {
          currentPosition += USER_DATA_SIZE;
        }

        const obj = {
          type: aUsrMsg.type,
          data: signalContent,
        };

        if (aUsrMsg.to) {
          obj.to = aUsrMsg.to;
        }

        return obj;
      }

      const session = this;
      return new Promise((resolve, reject) => {
        const msg = {
          type: aType,
          data: compress(aMsgData && JSON.stringify(aMsgData) || ''),
        };
        const msgId = ++messageOrder;
        const dataSize = msg.data.length + 2;
        let totalSegments =
          msg.data ? Math.ceil(dataSize / USER_DATA_SIZE) : 1;
        totalSegments = Math.max(
          Math.ceil((dataSize + (HEAD_SIZE + 2) * totalSegments) / USER_DATA_SIZE),
          totalSegments);

        const messagesSent = [];
        for (let segmentOrder = 0; segmentOrder < totalSegments; segmentOrder++) {
          const signalData = composeSegment(msgId, segmentOrder, totalSegments, msg);
          if (aTo) {
            signalData.to = aTo;
          }
          messagesSent[segmentOrder] =
            new Promise((resolveMessage, rejectMessage) => { /* jshint ignore: line */
              session.signal(signalData, (error) => {
                (error && (rejectMessage(error) || true)) || resolveMessage();
              });
            });
        }
        Promise.all(messagesSent).then(resolve).catch(reject);
      });
    };
    return sendSignalFn;
  })();

  const receiveMultipartMsg = (function() {
    const _msgPieces = {};

    //
    // Multipart message reception proccess
    //
    function parseMultiPartMsg(aEvt) {
      let dataParsed;
      try {
        dataParsed = JSON.parse(aEvt.data);
      } catch (e) {} // eslint-disable-line
      if (!aEvt.from || !dataParsed || !dataParsed._head) {
        return null;
      }
      return {
        connectionId: aEvt.from.connectionId,
        head: dataParsed._head,
        data: dataParsed.data,
      };
    }

    const execAllFunctions = function(aPromise, aFunctions) {
      aFunctions.forEach(function(aFc) {
        aPromise.then(aFc);
      });
    };

    const receiveMultipartMsgFn = function(aFcClients, aEvt) {
      const parsedMsg = parseMultiPartMsg(aEvt);
      let newPromise = null;

      if (parsedMsg === null) { // This doesn't look like a multi party msg... Just pass it down
        execAllFunctions(Promise.resolve(aEvt), aFcClients);
        return;
      }

      let connection = _msgPieces[parsedMsg.connectionId];
      // First msg from a client
      if (!connection) {
        connection = {};
        _msgPieces[parsedMsg.connectionId] = connection;
      }

      let msg = connection[parsedMsg.head.id];

      // First piece of a message
      if (!msg) {
        msg = {
          have: 0,
          data: new Array(parsedMsg.head.tot),
          promiseSolver: null,
        };
        // Get a new solver
        newPromise = new Promise(function (resolve) {
          msg.promiseSolver = resolve;
        });
        execAllFunctions(newPromise, aFcClients);
        connection[parsedMsg.head.id] = msg;
      }
      // This shouldn't be needed since we can only set one handler per signal
      // now, but doesn't hurt
      if (!msg.data[parsedMsg.head.seq]) {
        msg.data[parsedMsg.head.seq] = parsedMsg.data;
        msg.have++;
      }
      // If we have completed the message, fulfill the promise
      if (msg.have >= parsedMsg.head.tot) {
        aEvt.data = uncompress(msg.data.join(''));
        msg.promiseSolver(aEvt);
        delete connection[parsedMsg.head.id];
      }
    };

    return receiveMultipartMsgFn;

    // END Reception multipart message proccess
  }());

  // We need to intercept the messages which type is multipart and wait until
  // the message is complete before to send it (launch client event)
  // aHandlers is an array of objects
  function _setHandlers(aBindTo, aReceiver, aHandlers) {
    const _interceptedHandlers = {};

    // First add the handlers removing the ones we want to intercept...
    for (let i = 0; i < aHandlers.length; i++) {
      const _handlers = {};
      Object.
        keys(aHandlers[i]).
        forEach(function(evtName) { /* jshint ignore: line */
          const handler = aHandlers[i][evtName];
          if (evtName.startsWith(MSG_MULTIPART)) {
            _interceptedHandlers[evtName] = _interceptedHandlers[evtName] || [];
            _interceptedHandlers[evtName].push(handler.bind(aBindTo));
          } else {
            _handlers[evtName] = handler.bind(aBindTo);
          }
        });
      aReceiver.on(_handlers);
    }

    // And then add the intercepted handlers
    Object.
      keys(_interceptedHandlers).
      forEach(function(evtName) {
        _interceptedHandlers[evtName] =
          receiveMultipartMsg.bind(undefined, _interceptedHandlers[evtName]);
      });
    aReceiver.on(_interceptedHandlers);
  }

  // aSessionInfo must have sessionId, apiKey, token
  function OTHelper(aSessionInfo) {
    let _session;
    let _publisher;
    let _publisherInitialized = false;
    const _sessionInfo = aSessionInfo;


    function disconnect() {
      if (_session) {
        _session.disconnect();
      }
    }

    function off() {
      _session && _session.off();
    }

    // aHandlers is either an object with the handlers for each event type
    // or an array of objects
    function connect(aHandlers) {
      const self = this; /* jshint ignore: line */
      const { apiKey, sessionId, token } = _sessionInfo;
      if (aHandlers && !Array.isArray(aHandlers)) {
        aHandlers = [aHandlers];
      }
      return otLoaded.then(function() {
        return new Promise(function(resolve, reject) {
          if (!(apiKey && sessionId && token)) {
            return reject({
              message: 'Invalid parameters received. ' +
                'ApiKey, sessionId and Token are mandatory',
            });
          }
          disconnect();
          _session = OT.initSession(apiKey, sessionId);
          _session.off();

          aHandlers && _setHandlers(self, self.session, aHandlers);

          return _session.connect(token, function(error) {
            if (error) {
              reject(error);
            } else {
              self.sendSignal = sendSignal.bind(_session);
              resolve(_session);
            }
          });
        });
      });
    }

    function removeListener(evtName) {
      _session.off(evtName);
    }

    let _publishOptions;
    // We will use this in case the first publish fails. On the error we will give the caller a
    // promise that will fulfill when/if the publish succeeds at some future time (because of a
    // retry).
    let _solvePublisherPromise;
    let _publisherPromise = new Promise(function(resolve) {
      _solvePublisherPromise = resolve;
    });

    function publish(aDOMElement, aProperties, aHandlers) {
      const self = this; /* jshint ignore: line */
      _publishOptions = null;
      const propCopy = {};
      Object.keys(aProperties).forEach(function(aKey) {
        propCopy[aKey] = aProperties[aKey];
      });
      return new Promise(function(resolve, reject) {
        function processError(error) {
          _publishOptions = {
            elem: aDOMElement,
            properties: propCopy,
            handlers: aHandlers,
          };
          _publisher = null;
          reject({ error, publisherPromise: _publisherPromise });
        }

        _publisher = OT.initPublisher(aDOMElement, propCopy, function(error) {
          if (error) {
            processError({
              name: error.name,
              message: 'Error initializing publisher: ' + error.message,
            });
            return;
          }
          _session.publish(_publisher, function(err) {
            if (err) {
              processError(err);
            } else {
              _publisherInitialized = true;
              Object.keys(aHandlers).forEach(function(name) {
                _publisher.on(name, aHandlers[name].bind(self));
              });
              _solvePublisherPromise(_publisher);
              resolve(_publisher);
            }
          });
        });
      });
    }

    function subscribeTo(aStream, name, value) {
      const arrSubscribers = _session.getSubscribersForStream(aStream);
      // TODO Currently we expect only one element in arrSubscriber
      Array.isArray(arrSubscribers) && arrSubscribers.forEach(function(subscriber) {
        subscriber['subscribeTo' + name](value);
      });
    }

    function retryPublish() {
      return publish(_publishOptions.elem, _publishOptions.properties, _publishOptions.handlers);
    }

    function publisherReady() {
      return _publisher && _publisherPromise ||
        _publishOptions && retryPublish() ||
        Promise.reject();
    }

    function destroyPublisher() {
      if (!_publisher) {
        return;
      }
      _publisher.destroy();
      _publisher = null;
      _publisherPromise = new Promise(function(resolve) {
        _solvePublisherPromise = resolve;
      });
      _publisherInitialized = false;
    }

    function togglePublisherProperty(aProperty, aValue) {
      publisherReady().then(function(aPublisher) {
        aPublisher['publish' + aProperty](aValue);
      });
    }

    function togglePublisherVideo(aValue) {
      return togglePublisherProperty('Video', aValue);
    }

    function togglePublisherAudio(aValue) {
      return togglePublisherProperty('Audio', aValue);
    }

    /*
     * V2 Publishing... adding as new methods so as to not break compat... All the methods have the
     * V2 suffix, even the ones that don't really exist on V1, if only to try to avoid mixing them
     */
    // Creates a publisher and returns the ID immediately...
    const publishers = {};
    const publisherPromises = {};
    const publisherIsLive = {};
    const failedPublisherOptions = { };

    function initPublisherV2(aDOMElement, aProperties, aHandlers) {
      const self = this; /* jshint ignore: line */
      const propCopy = Object.assign({}, aProperties);
      let solver;
      let rejecter;
      const pubReady = new Promise((resolve, reject) => {
        solver = resolve;
        rejecter = reject;
      });

      const publisher = OT.initPublisher(aDOMElement, propCopy, (error) => {
        if (error) {
          failedPublisherOptions[publisher.id] = {
            elem: aDOMElement,
            properties: propCopy,
            handlers: aHandlers,
          };
          rejecter({ error });
        }
        Object.keys(aHandlers).forEach(name => publisher.on(name, aHandlers[name].bind(self)));
        publishers[publisher.id] = publisher;
        solver(publisher.id);
      });

      publisherPromises[publisher.id] = pubReady;
      return publisher.id;
    }

    // Returns a promise that fulfills when/if the publisher can be initialized
    const publisherReadyV2 =
      id => publisherPromises[id] || Promise.reject({ error: 'Unknown Id' });

    const publisherLiveV2 = id => !!publisherIsLive[id];

    // Publishes to a session...
    function publishToSessionV2(id) {
      return publisherReadyV2(id).
        then(() => new Promise((resolve, reject) => {
          _session.publish(publishers[id], (error) => {
            if (error) {
              return reject({ error });
            }
            publisherIsLive[id] = true;
            return resolve();
          });
        }));
    }

    // Retries a previous attempt at publishing
    const retryInitPublisherV2 = id => failedPublisherOptions[id] &&
      initPublisherV2(failedPublisherOptions[id].elems, failedPublisherOptions[id].properties,
        failedPublisherOptions[id].handlers);

    // Stops publishing to a session. Does not destroy the publisher. Note: Need to add a handler
    // to avoid removing the publisher from the view if we want to keep it
    function stopPublishingToSessionV2(id) {
      if (!publisherIsLive[id]) {
        return false;
      }
      publisherIsLive[id] = false;
      _session.unpublish(publishers[id]);
      return true;
    }

    // And this one destroys the publisher
    const destroyPublisherV2 =
      id => publishers[id] && (publishers[id].destroy() || (publishers[id] = null) || true);

    function togglePublisherPropertyV2(id, aProperty, aValue) {
      publisherReadyV2(id).then(function(aPublisherId) {
        publishers[aPublisherId]['publish' + aProperty](aValue);
      });
    }

    const togglePublisherVideoV2 = (id, aValue) => togglePublisherPropertyV2(id, 'Video', aValue);

    const togglePublisherAudioV2 = (id, aValue) => togglePublisherPropertyV2(id, 'Audio', aValue);

    /*
    * End of the V2 publishing methods...
    */

    function toggleSubscribersVideo(aStream, value) {
      subscribeTo(aStream, 'Video', value);
    }

    function toggleSubscribersAudio(aStream, value) {
      subscribeTo(aStream, 'Audio', value);
    }

    let _screenShare;

    const FAKE_OTK_ANALYTICS = global.OTKAnalytics ||
      (() => ({ addSessionInfo() {}, logEvent: (a, b) => console.log(a, b) }));
    // TO-DO: Make this configurable
    const IMAGE_ASSETS = '/images/annotations/';
    const TOOLBAR_BG_COLOR = '#1a99ce';

    function getAnnotation(aDomElement, aOptions) {
      aOptions = aOptions || {};
      const options = {
        session: aOptions.session || _session,
        watchForResize: aOptions.watchForResize || global,
        canvasContainer: aDomElement,
        OTKAnalytics: aOptions.OTKAnalytics || FAKE_OTK_ANALYTICS,
        imageAssets: IMAGE_ASSETS,
      };
      return new AnnotationAccPack(options);
    }

    function startAnnotation(aAccPack) {
      if (!aAccPack) {
        return Promise.resolve();
      }
      return aAccPack.start(_session, {
        imageAssets: IMAGE_ASSETS,
        backgroundColor: TOOLBAR_BG_COLOR,
      });
    }

    // aElement can be a publisher, a subscriber or a AnnotationPack
    function endAnnotation(aElement) {
      const annPack = aElement && aElement._ANNOTATION_PACK || aElement;
      annPack && annPack.end && annPack.end();
    }

    function setupAnnotation(aAccPack, aPubSub, aParentElement) {
      if (!aAccPack) {
        return;
      }
      const container = global.document.getElementById(aPubSub.id);
      const canvasOptions = {
        absoluteParent: aParentElement,
      };
      aAccPack.linkCanvas(aPubSub, container, canvasOptions);
      aPubSub._ANNOTATION_PACK = aAccPack;
    }

    let maxConcurrentSubs = 0;
    let runningSubs = 0;
    const pendingSubs = [];

    function subscribe(aStream, aTargetElement, aProperties, aHandlers, aEnableAnnotation) {
      if (maxConcurrentSubs && runningSubs >= maxConcurrentSubs) {
        logger.trace(
          'Subscribe: Delayed subscription to: ', aStream, maxConcurrentSubs, runningSubs,
          pendingSubs.length
        );
        return new Promise(solver => pendingSubs.push(solver)).
          then(() => subscribe(aStream, aTargetElement, aProperties, aHandlers));
      }
      runningSubs++;
      const self = this; /* jshint ignore: line */
      return new Promise(function(resolve, reject) {
        const subscriber =
          _session.subscribe(aStream, aTargetElement, aProperties, function(error) {
            error ? reject(error) : resolve(subscriber);
          });
      }).then(function(subscriber) {
        Object.keys(aHandlers).forEach(function(name) {
          subscriber.on(name, aHandlers[name].bind(self));
        });
        subscriber.on('destroyed', function() {
          aTargetElement.dataset.videoDimensions = undefined;
          aTargetElement.dataset.videoType = undefined;
          subscriber.off();
          endAnnotation(subscriber);
        });

        aTargetElement.dataset.videoDimensions = JSON.stringify(aStream.videoDimensions);
        aTargetElement.dataset.videoType = aStream.videoType;
        runningSubs--;
        if (pendingSubs.length > 0 && (!maxConcurrentSubs || runningSubs < maxConcurrentSubs)) {
          logger.trace(
            'Subscribe: Launching delayed subscription:', maxConcurrentSubs, runningSubs,
            pendingSubs.length
          );
          (pendingSubs.shift())();
        }
        try {
          aProperties.restrictFrameRate &&
            subscriber.restrictFrameRate(aProperties.restrictFrameRate);
        } catch (ex) {
          logger.warn('Failed calling restrictFrameRate', ex);
        }
        const subsAnnotation =
          (aEnableAnnotation && aStream.videoType === 'screen' && getAnnotation(aTargetElement)) ||
          null;
        return startAnnotation(subsAnnotation).then(function() {
          setupAnnotation(
            subsAnnotation, subscriber,
            global.document.querySelector('.opentok-stream-container'));
          return subscriber;
        });
      });
    }

    function stopShareScreen() {
      // Should I return something like true/false or deleted element?
      endAnnotation(_screenShare);
      _screenShare && _session.unpublish(_screenShare);
      _screenShare = null;
    }

    function shareScreen(aDOMElement, aProperties, aHandlers, aEnableAnnotation) {
      const self = this; /* jshint ignore: line */
      const screenShareCapability = getScreenShareCapability();
      if (!Array.isArray(aHandlers)) {
        aHandlers = [aHandlers];
      }

      return screenShareCapability.then(function() {
        return new Promise(function(resolve, reject) {
          const annotationAccPack = aEnableAnnotation && getAnnotation(aDOMElement);
          startAnnotation(annotationAccPack).
            then(function() {
              _screenShare = OT.initPublisher(aDOMElement, aProperties, (error) => {
                if (error) {
                  endAnnotation(annotationAccPack);
                  return reject(error);
                }
                return _session.publish(_screenShare, (err) => {
                  if (err) {
                    endAnnotation(annotationAccPack);
                    return reject({
                      code: PUB_SCREEN_ERROR_CODES.errPublishingScreen,
                      message: err.message,
                    });
                  }
                  const { videoDimensions, videoType } = _screenShare.stream;
                  aDOMElement.dataset.videoDimensions = JSON.stringify(videoDimensions);
                  aDOMElement.dataset.videoType = videoType;
                  setupAnnotation(annotationAccPack, _screenShare, aDOMElement);
                  _screenShare.on('streamDestroyed', () => {
                    aDOMElement.dataset.videoType = undefined;
                    aDOMElement.dataset.videoDimensions = undefined;
                  });
                  return resolve(_screenShare);
                });
              });
              aHandlers && _setHandlers(self, _screenShare, aHandlers);
            });
        });
      });
    }

    function setPreferredResolution(
      aSubscriber, aTotalDimension, aSubsDimension, aSubsNumber, aAlgorithm) {
      const PrefResolutionAlgProv = global.PreferredResolutionAlgorithmProvider;
      if (!PrefResolutionAlgProv) {
        return;
      }
      const algInfo = PrefResolutionAlgProv.getAlg(aAlgorithm);
      const { chosenAlgorithm, algorithm } = algInfo;
      const streamDimension = aSubscriber.stream.videoDimensions;
      const newDimension =
        algorithm(streamDimension, aTotalDimension, aSubsDimension, aSubsNumber);
      logger.trace(
        'setPreferedResolution -', chosenAlgorithm, ':', aSubscriber.stream.streamId,
        'of', aSubsNumber, ': Existing:', streamDimension, 'Requesting:', newDimension);
      aSubscriber.setPreferredResolution(newDimension);
    }

    function getStream(type, domElem) {
      let stream;
      if (domElem.captureStream) {
        stream = domElem.captureStream();
      } else if (domElem.mozCaptureStream) {
        stream = domElem.mozCaptureStream();
      } else {
        return null;
      }

      let tracks;
      switch (type) {
        case 'Audio':
          tracks = stream.getAudioTracks();
          break;
        case 'Video':
          tracks = stream.getVideoTracks();
          break;
        default:
          tracks = null;
      }
      return tracks && tracks.length > 0 && tracks[0] || null;
    }

    function getVideoStream(elem) {
      return getStream('Video', elem);
    }

    function getAudioStream(elem) {
      return getStream('Audio', elem);
    }

    /**
     * OPENTOK-37378 Chrome has problems getting the audio from some videos with
     * HTMLMediaElement.captureStream()
     *
     * This is a workaround to get the audio from the element using the Web Audio API
     */
    function getAudioTrackUsingWebAudio(elem) {
      // Store the web audio objects in a element property
      let webAudio = elem.webAudio; // eslint-disable-line
      if (!webAudio) {
        webAudio = {
          context: new (window.AudioContext || window.webkitAudioContext)(),
        };
        elem.webAudio = webAudio;
        webAudio.sourceNode = webAudio.context.createMediaElementSource(elem);
        // To hear the video locally, we need to send the audio also to the local speakers
        webAudio.sourceNode.connect(webAudio.context.destination);
      } else {
        // Disconnect the previous node
        webAudio.mediaStreamNode.disconnect();
      }
      // We need to recreate the media stream node because it can be inactive
      webAudio.mediaStreamNode = webAudio.context.createMediaStreamDestination()
      webAudio.sourceNode.connect(webAudio.mediaStreamNode);

      const audioTracks = webAudio.mediaStreamNode.stream.getAudioTracks();
      return audioTracks && audioTracks.length > 0 && audioTracks[0] || null;
    }

    function initMediaStreamPublisher(sourceElem, dstElem, aProperties, aHandlers) {
      const videoStream = getVideoStream(sourceElem);
      const audioStream = window.chrome ?
        getAudioTrackUsingWebAudio(sourceElem) :
        getAudioStream(sourceElem);

      const properties = Object.assign({}, aProperties);

      if (!videoStream && !audioStream) {
        logger.trace('Nothing to publish');
        return null;
      }

      videoStream && (properties.videoSource = videoStream) || (properties.publishVideo = false);
      audioStream && (properties.audioSource = audioStream) || (properties.publishAudio = false);

      const pubId = initPublisherV2(dstElem, properties, aHandlers);
      return pubId;
    }

    return {
      get session() {
        return _session;
      },
      connect,
      off,
      publish,
      destroyPublisher,
      get maxConcurrentSubscriptions() {
        return maxConcurrentSubs;
      },
      set maxConcurrentSubscriptions(v) {
        maxConcurrentSubs = parseInt(v, 10) || 0;
      },
      subscribe,
      toggleSubscribersAudio,
      toggleSubscribersVideo,
      togglePublisherAudio,
      togglePublisherVideo,
      shareScreen,
      stopShareScreen,
      get isPublisherReady() {
        return _publisherInitialized;
      },
      disconnect,
      removeListener,
      publisherHas(aType) {
        return _publisher.stream['has' + (aType.toLowerCase() === 'audio' && 'Audio' || 'Video')];
      },
      get publisherId() {
        return (_publisherInitialized && _publisher && _publisher.stream && _publisher.stream.id) ||
          null;
      },
      isMyself(connection) {
        return _session &&
          _session.connection.connectionId === connection.connectionId;
      },
      get screenShare() {
        return _screenShare;
      },
      getImg(stream) {
        if (!stream) {
          return null;
        }

        if (typeof stream.getImgData === 'function') {
          return stream.getImgData();
        }

        const subscribers = _session.getSubscribersForStream(stream);
        return subscribers.length ? subscribers[0].getImgData() : null;
      },
      showAnnotationToolbar(aShow) {
        const container = global.document.getElementById('annotationToolbarContainer');
        if (!container) {
          return;
        }
        (aShow && (container.classList.remove('ots-hidden') || true)) ||
          container.classList.add('ots-hidden');
      },
      setPreferredResolution,
      getDevices: () => otLoaded.then(() => OTAsPromised.getDevices()),
      initPublisherV2,
      publisherLiveV2,
      retryInitPublisherV2,
      publishToSessionV2,
      stopPublishingToSessionV2,
      destroyPublisherV2,
      publisherReadyV2,
      togglePublisherVideoV2,
      togglePublisherAudioV2,
      initMediaStreamPublisher,
    };
  }

  OTHelper.registerScreenShareExtension = registerScreenShareExtension;
  OTHelper.screenShareErrorCodes = PUB_SCREEN_ERROR_CODES;

  global.OTHelper = OTHelper;

}(this));
