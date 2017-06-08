var assert = chai.assert;
var expect = chai.expect;
var should = chai.should();

describe('Utils', function() {

  var realLazyLoader = null;

  before(function() {
    realLazyLoader = window.LazyLoader;
    window.LazyLoader = {
      dependencyLoad: function() { return Promise.resolve(); },
      load: function() { return Promise.resolve(); }
    };
  });

  after(function() {
    window.LazyLoader = realLazyLoader;
  });

  it('should exist', function() {
    expect(Utils).to.exist;
  });

  describe('#isScreen', function() {
    it('should exist and be a function', function() {
      expect(Utils.isScreen).to.exist;
      expect(Utils.isScreen).to.be.a('function');
    });

    it('should return true when item is a desktop', function() {
      var item = document.createElement('div');
      item.dataset.streamType = 'desktop';
      expect(Utils.isScreen(item)).to.be.true;
    });

    it('should return true when item is a screen', function() {
      var item = document.createElement('div');
      item.dataset.streamType = 'screen';
      expect(Utils.isScreen(item)).to.be.true;
    });

    it('should return false when item is not desktop neither screen', function() {
      expect(Utils.isScreen(document.createElement('div'))).to.be.false;
    });
  });

  describe('#sendEvent', function(){
    it('should exist and be a function', function() {
      expect(Utils.sendEvent).to.exist;
      expect(Utils.sendEvent).to.be.a('function');
    });

    it('should send custom events', function(done) {
      var target = document.body;

      var eventName = 'myEvent';
      var data = {
        one: '1',
        two: '2'
      };

      target.addEventListener(eventName, function(evt) {
        expect(evt.type).to.equal(eventName);
        expect(evt.detail).to.deep.equal(data);
        done();
      });

      Utils.sendEvent(eventName, data, target);
    });
  });

  describe('#getDraggable', function(){
    it('should exist and be a function', function() {
      expect(Utils.getDraggable).to.exist;
      expect(Utils.getDraggable).to.be.a('function');
    });

    it('should return the Draggable object', function(done) {
      Utils.getDraggable().then(function(obj) {
        expect(obj).to.be.equal(Draggable);
        done();
      })
    });
  });

  describe('#decodeStr', function(){
    it('should exist and be a function', function() {
      expect(Utils.decodeStr).to.exist;
      expect(Utils.decodeStr).to.be.a('function');
    });

    it('should decode strings', function() {
      var str = 'Collaboration%20Demo';
      expect(Utils.decodeStr(str)).to.equal('Collaboration Demo');
      str = 'Collaboration+Demo';
      expect(Utils.decodeStr(str)).to.equal('Collaboration+Demo');
    });
  });

  describe('#setDisabled', function() {
    it('should exist and be a function', function() {
      expect(Utils.setDisabled).to.exist;
      expect(Utils.setDisabled).to.be.a('function');
    });

    it('should disable/enable DOM elements', function() {
      var elem = document.createElement('div');
      [true, false].forEach(function(aValue) {
        Utils.setDisabled(elem, aValue);
        expect(elem.disabled).to.be.equal(aValue);
      });
    });
  });

  describe('#generateSearchStr', function() {
    it('should exist and be a function', function() {
      expect(Utils.generateSearchStr).to.exist;
      expect(Utils.generateSearchStr).to.be.a('function');
    });

    it('should throw a TypeError on undefined', sinon.test(function() {
      this.spy(Utils, 'generateSearchStr');
      try {
        Utils.generateSearchStr(undefined);
      } catch(e) {}
      expect(Utils.generateSearchStr.threw('TypeError')).to.be.true;
    }));

    var useCases = [
      {
        input: {key: 'value'},
        output: '?key=value'
      },
      {
        input: {key: 'value', key2: 'value2'},
        output: '?key=value&key2=value2'
      },
      {
        input: {key: 'value', key2: ['value2', 'value3']},
        output: '?key=value&key2=value2&key2=value3'
      },
      {
        input: {key: 'value', key2: undefined, key3: 'value3'},
        output: '?key=value&key2&key3=value3'
      },
      {
        input: {key: 'value', key2: undefined,
                key3: ['value3', 'value4', 'value5'], key4: undefined},
        output: '?key=value&key2&key3=value3&key3=value4&key3=value5&key4'
      }
    ];

    useCases.forEach(function(useCase) {
      it('should generate ' + useCase.output + ' for ' + JSON.stringify(useCase.input), function() {
        expect(Utils.generateSearchStr(useCase.input)).to.be.equal(useCase.output);
      });
    });

  });

  describe('#parseSearch', function() {
    it('should exist and be a function', function() {
      expect(Utils.parseSearch).to.exist;
      expect(Utils.parseSearch).to.be.a('function');
    });

    it('should throw a TypeError on undefined', sinon.test(function() {
      this.spy(Utils, 'parseSearch');
      try {
        Utils.parseSearch(undefined);
      } catch(e) {}
      expect(Utils.parseSearch.threw('TypeError')).to.be.true;
    }));

    var results = [];

    var useCases = [
      {
        input: '',
        output: {
          '': null
        },
        getFirst: {
          input: '',
          output: null
        }
      },
      {
        input: 'SomeChain',
        output: {
          'omeChain': null
        },
        getFirst: {
          input: 'omeChain',
          output: null
        }
      },
      {
        input: '?someVariable',
        output: {
          'someVariable': null
        },
        getFirst: {
          input: 'someVariable',
          output: null
        }
      },
      {
        input: '?someVariable=someValue',
        output: {
          'someVariable': 'someValue'
        },
        getFirst: {
          input: 'someVariable',
          output: 'someValue'
        }
      },
      {
        input: '?someVariable=some+Value',
        output: {
          'someVariable': 'some+Value'
        },
        getFirst: {
          input: 'someVariable',
          output: 'some Value'
        }
      },
      {
        input: '?someVariable=some%20Value',
        output: {
          'someVariable': 'some Value'
        },
        getFirst: {
          input: 'someVariable',
          output: 'some Value'
        }
      },
      {
        input: '?someVariable=someValue&variableWithoutValue&someOtherVariable=someOtherValue',
        output: {
          'someVariable': 'someValue',
          'variableWithoutValue': null,
          'someOtherVariable': 'someOtherValue'
        },
        getFirst: {
          input: 'someVariable',
          output: 'someValue'
        }
      },
      {
        input: '?someVariable=someValue&variableWithoutValue&someVariable=someOtherValue',
        output: {
          'someVariable': ['someValue', 'someOtherValue'],
          'variableWithoutValue': null
        },
        getFirst: {
          input: 'someVariable',
          output: 'someValue'
        }
      },
      {
        input: '?var1=val1&var2&var1=val2&var1=val2&var3&var3=val3',
        output: {
          'var1': ['val1', 'val2', 'val2'],
          'var2': null,
          var3: [null, 'val3']
        },
        getFirst: {
          input: 'var3',
          output: null
        }
      }
    ];

    useCases.forEach(function(useCase) {
      it('should generate as params' + JSON.stringify(useCase.output) + ' for ' +
         useCase.input, function() {
        var result = Utils.parseSearch(useCase.input);
        expect(result.params).to.be.deep.equal(useCase.output);
        results.push(result);
      });
    });

    describe('#getFirstValue', function() {
      it('should always return a getFirstValue method on the object\'\'', sinon.test(function() {
        results.forEach(function(aResult) {
          expect(aResult.getFirstValue).to.exist;
          expect(aResult.getFirstValue).to.be.a.function;
        });
      }));

      results.forEach(function(result, index) {
        it('should return ' + useCases[index].getFirst.output + ' when called with ' +
           useCases[index].getFirst.input + 'on the use case #' + index, function() {
             var useCase = useCases[index].getFirst;
             expect(result.getFirstValue(useCase.input)).to.be.equal(useCase.output);
        });
      });

    });

  });

  describe('#isChrome', function() {

    var realUserAgent = null,
        realVendor = null,
        customUserAgent = '',
        customVendor = '';

    before(function() {
      realUserAgent = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');;
      Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        get: function() {
          return customUserAgent;
        }
      });

      realVendor = Object.getOwnPropertyDescriptor(window.navigator, 'vendor');;
      Object.defineProperty(window.navigator, 'vendor', {
        configurable: true,
        get: function() {
          return customVendor;
        }
      });
    });

    after(function() {
      realUserAgent && Object.defineProperty(window.navigator, 'userAgent', realUserAgent);
      realVendor && Object.defineProperty(window.navigator, 'vendor', realVendor);
    });

    it('should exist and be a function', function() {
      expect(Utils.isChrome).to.exist;
      expect(Utils.isChrome).to.be.a('function');
    });

    it('should return true when browser is chrome', function() {
      customUserAgent = 'Chrome';
      customVendor = 'google inc';
      expect(Utils.isChrome()).to.be.true;
    });

    it('should return false when browser is firefox', function() {
      customUserAgent = 'Mozilla/5.0';
      expect(Utils.isChrome()).to.be.false;
    });

    it('should return false when browser is IE', function() {
      customUserAgent = 'msie';
      expect(Utils.isChrome()).to.be.false;
    });

  });

  describe('#isIE', function() {

    var realUserAgent = null,
        realVendor = null,
        customUserAgent = '',
        customVendor = '';

    before(function() {
      realUserAgent = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');;
      Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        get: function() {
          return customUserAgent;
        }
      });

      realVendor = Object.getOwnPropertyDescriptor(window.navigator, 'vendor');;
      Object.defineProperty(window.navigator, 'vendor', {
        configurable: true,
        get: function() {
          return customVendor;
        }
      });
    });

    after(function() {
      realUserAgent && Object.defineProperty(window.navigator, 'userAgent', realUserAgent);
      realVendor && Object.defineProperty(window.navigator, 'vendor', realVendor);
    });

    it('should exist and be a function', function() {
      expect(Utils.isIE).to.exist;
      expect(Utils.isIE).to.be.a('function');
    });

    it('should return true when browser is IE', function() {
      customUserAgent = 'msie';
      expect(Utils.isIE()).to.be.true;
    });

    it('should return false when browser is firefox', function() {
      customUserAgent = 'Mozilla/5.0';
      expect(Utils.isIE()).to.be.false;
    });

    it('should return false when browser is chrome', function() {
      customUserAgent = 'Chrome';
      expect(Utils.isIE()).to.be.false;
    });

  });

  describe('#setParentValidOrigins', function() {

    it('should exist and be a function', function() {
      expect(Utils.setParentValidOrigins).to.exist;
      expect(Utils.setParentValidOrigins).to.be.a('function');
    });

  });

  describe('#sendToParent', function() {

    var type = 'type';
    var data = 'data';

    it('should exist and be a function', function() {
      expect(Utils.sendToParent).to.exist;
      expect(Utils.sendToParent).to.be.a('function');
    });

    it('should forward the message to parent with same origin by default', sinon.test(function() {
      this.stub(window.parent, 'postMessage', function() {});

      Utils.sendToParent(type, data);

      expect(window.parent.postMessage.calledOnce).to.be.true;
      expect(window.parent.postMessage.getCall(0).args[0]).to.be.deep.equal({
        type: type,
        data: data
      });
      expect(window.parent.postMessage.getCall(0).args[1]).to.be.equal(document.location.origin);
    }));

    it('should forward the message to parent with same origin and also to valid origins chosen',
      sinon.test(function() {
        var validOrigins = ['a', 'b', 'c'];

        this.stub(window.parent, 'postMessage', function() {});

        Utils.setParentValidOrigins(validOrigins);
        Utils.sendToParent(type, data);

        validOrigins.concat(document.location.origin).forEach(function(validOrigin, index) {
          expect(window.parent.postMessage.getCall(index).args[0]).to.be.deep.equal({
            type: type,
            data: data
          });
          console.log(window.parent.postMessage.getCall(index).args[1], validOrigin)
          expect(window.parent.postMessage.getCall(index).args[1]).to.be.equal(validOrigin);
        });
      })
    );

  });

  describe('#getCurrentTime', function() {

    it('should exist and be a function', function() {
      expect(Utils.getCurrentTime).to.exist;
      expect(Utils.getCurrentTime).to.be.a('function');
    });

    it('should return the current time in 12h format with AM/PM', sinon.test(function() {
      var hours = Math.round(Math.random() * 23);
      var minutes = Math.round(Math.random() * 59);

      this.stub(window, 'Date', function() {
        return {
          getHours: function() {
            return hours;
          },
          getMinutes: function() {
            return minutes;
          }
        }
      });

      var result = [];
      var suffix = ' AM';
      if (hours > 12) {
        suffix = ' PM';
        result.push(hours - 12);
      } else {
        result.push(hours);
      }
      result.push(':');
      minutes < 10 && result.push('0');
      result.push(minutes);
      result.push(suffix);
      expect(Utils.getCurrentTime()).to.be.equal(result.join(''));
    }));

  });

  describe('#inspectObject', function() {

    it('should exist and be a function', function() {
      expect(Utils.inspectObject).to.exist;
      expect(Utils.inspectObject).to.be.a('function');
    });

    it('should stringify the object', sinon.test(function() {
      this.stub(JSON, 'stringify', function() { return ''; });

      var obj = {
        data: 'data'
      };

      var str = '';
      Object.keys(obj).forEach(function(elto) {
        str += '\n' + elto + ':';
      });

      expect(Utils.inspectObject(obj)).to.be.equal(str);
    }));

  });

  describe('#addEventsHandlers', function() {

    var eventPreffixName = 'eventPreffixName:';

    var createHandlers = function() {
      var ret = {};
      var num = Math.round(Math.random() * 10) + 1;
      for (var i = 0; i < num; i++) {
        ret['key' + i] = function() {};
      }
      return ret;
    }

    var check = function(handlers, target) {
      for (var i = 0; i < Object.keys(handlers).length; i++) {
        expect(target.addEventListener.getCall(i).args[0]).to.be.equal(eventPreffixName + 'key' + i);
        expect(target.addEventListener.getCall(i).args[1]).to.be.equal(handlers['key' + i]);
      }
    }

    it('should exist and be a function', function() {
      expect(Utils.addEventsHandlers).to.exist;
      expect(Utils.addEventsHandlers).to.be.a('function');
    });

    it('should add event handlers to target element', sinon.test(function() {
      var target = document.createElement('div');

      this.spy(target, 'addEventListener');

      var handlers = createHandlers();

      Utils.addEventsHandlers(eventPreffixName, handlers, target);

      check(handlers, target);
    }));

    it('should add event handlers to window without target element', sinon.test(function() {
      this.spy(window, 'addEventListener');

      var handlers = createHandlers();

      Utils.addEventsHandlers(eventPreffixName, handlers);

      check(handlers, window);
    }));

  });

  describe('#addHandlers', function() {

    var createHandlers = function(target) {
      var ret = {};
      var num = Math.round(Math.random() * 10) + 1;
      for (var i = 0; i < num; i++) {
        ret[i] = {
          name: 'key' + i,
          handler: function() {}
        };

        target && (ret[i].target = target);
      }
      return ret;
    }

    var check = function(handlers, target) {
      for (var i = 0; i < Object.keys(handlers).length; i++) {
        expect(target.addEventListener.getCall(i).args[0]).to.be.equal(handlers[i].name);
        expect(target.addEventListener.getCall(i).args[1]).to.be.equal(handlers[i].handler);
      }
    }

    it('should exist and be a function', function() {
      expect(Utils.addHandlers).to.exist;
      expect(Utils.addHandlers).to.be.a('function');
    });

    it('should add handlers to target element', sinon.test(function() {
      var target = document.createElement('div');

      this.spy(target, 'addEventListener');

      var handlers = createHandlers(target);

      Utils.addHandlers(handlers, target);

      check(handlers, target);
    }));

    it('should add handlers to window without target element', sinon.test(function() {
      this.spy(window, 'addEventListener');

      var handlers = createHandlers();

      Utils.addHandlers(handlers);

      check(handlers, window);
    }));

  });

  describe('#addMessagesHandlers', function() {

    var validOrigin = 'a';

    before(function() {
      // To test -> typeof aAuthOrigins === 'string' && aAuthOrigins.split(',')
      Utils.setParentValidOrigins(validOrigin, 'b', 'c');
    });

    it('should exist and be a function', function() {
      expect(Utils.addMessagesHandlers).to.exist;
      expect(Utils.addMessagesHandlers).to.be.a('function');
    });

    var sendMessage = function(origin, data) {
      var event = document.createEvent('Event');
      event.initEvent('message', true, true);

      // To test -> var origin = event.origin || event.originalEvent.origin;
      if (Math.round(Math.random())) {
        event.origin = origin;
      } else {
        event.originalEvent = {
          origin: origin
        };
      }

      event.data = data;
      window.dispatchEvent(event);
    }

    it('should execute the handler when we receive a message from valid origin',
      sinon.test(function(done) {
        this.spy(window, 'addEventListener');

        var data = {
          type: 'type'
        };

        var handlers = {
          type: function(aData) {
            expect(aData).to.be.deep.equal(data);
            done();
          }
        };

        Utils.addMessagesHandlers(handlers);

        sendMessage(validOrigin, data);

        expect(window.addEventListener.getCall(0).args[0]).to.be.equal('message');
      })
    );

    it('should not execute the handler when we receive a message from invalid origin', function() {
      var data = {
        type: 'type'
      };

      var handlers = {
        type: function(aData) {
          throw new Error('Whoops! This should not be executed!');
        }
      };

      Utils.addMessagesHandlers(handlers);

      sendMessage('badOrigin', data);
    });

  });

  describe('#getLabelText', function() {

    it('should exist and be a function', function() {
      expect(Utils.getLabelText).to.exist;
      expect(Utils.getLabelText).to.be.a('function');
    });

    var toPrettyDuration = function(duration) {
      var time = [];

      // 0 hours -> Don't add digit
      var hours = Math.floor(duration / (60 * 60));
      if (hours) {
        time.push(hours);
        time.push(':');
      }

      // 0 minutes -> if 0 hours -> Don't add digit
      // 0 minutes -> if hours > 0 -> Add minutes with zero as prefix if minutes < 10
      var minutes = Math.floor(duration / 60) % 60;
      if (time.length) {
        (minutes < 10) && time.push('0');
        time.push(minutes);
        time.push(':');
      } else if (minutes) {
        time.push(minutes);
        time.push(':');
      }

      var seconds = duration % 60;
      (time.length) && (seconds < 10) && time.push('0');
      time.push(seconds);

      return time.join('');
    };

    it('should return the description for an archive', sinon.test(function() {
      var hours = Math.round(Math.random() * 23);
      var minutes = Math.round(Math.random() * 59);

      var dateToTest = new Date(1980, 04, 13, hours, minutes, 0);

      var archive = {
        createdAt: dateToTest.getTime(),
        recordingUser: 'Gustavo Adolfo',
        duration: Math.round(Math.random() * 1000) + 5
      };

      var time = (new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })).format(dateToTest).toLowerCase();

      var prefix = '';
      time.indexOf(':') === 1 && (prefix = '0');

      var expectedLabel = [prefix, time, ' - ', archive.recordingUser, '\'s Archive (',
        toPrettyDuration(archive.duration), 's)'].join('');

      expect(Utils.getLabelText(archive)).to.be.equal(expectedLabel);
    }));

  });

  describe('#setTransform', function() {
    it('should exist and be a function', function() {
      expect(Utils.setTransform).to.exist;
      expect(Utils.setTransform).to.be.a('function');
    });

    it('should set the transform for all prefixes', function() {
      var elem = {};
      var myTransform = 'translateX(0)';
      Utils.setTransform(elem, myTransform);
      ['MozTransform', 'webkitTransform', 'msTransform', 'transform'].forEach(function(value) {
        expect(elem[value]).to.be.equal(myTransform);
      });
    });
  });

  describe('#Timer', function() {
    var timer = null;
    var updateTime = 1000;
    var startValue = Math.floor(Math.random() * 10);
    var maximumValue = startValue + 100;
    var numMaximumTimes = maximumValue - startValue;
    var timerFn = function(aCurrentTime) {
      return ++aCurrentTime.time < maximumValue;
    };

    after(function() {
      timer && timer.stop();
    });

    it('should exist and be a function', function() {
      expect(Utils.Timer).to.exist;
      expect(Utils.Timer).to.be.a('function');
    });

    it('should execute the callback as often as intervals of updateTime', sinon.test(function() {
      var clock = sinon.useFakeTimers();
      timer = new Utils.Timer(updateTime, timerFn, startValue);
      var called = 0;
      timer.start(function() { ++called; });
      var num = Math.floor(Math.random() * numMaximumTimes);
      clock.tick(num * updateTime);
      expect(timer.currentTime).to.be.equal(num + startValue);
      expect(called).to.be.equal(num);
      clock.restore();
    }));

    it('should not execute the callback more times than function says', sinon.test(function() {
      var clock = sinon.useFakeTimers();
      timer = new Utils.Timer(updateTime, timerFn, startValue);
      var called = 0;
      timer.start(function() { ++called; });
      var num = Math.floor(Math.random() * numMaximumTimes * 1000);
      clock.tick(num * updateTime);
      expect(timer.currentTime).to.be.equal(maximumValue);
      expect(called).to.be.equal(numMaximumTimes);
      clock.restore();
    }));

    it('should be able to be paused', sinon.test(function() {
      var clock = sinon.useFakeTimers();
      timer = new Utils.Timer(updateTime, timerFn, startValue);
      var called = 0;
      timer.start(function() { ++called; });

      timer.pause();

      var num = Math.floor(Math.random() * maximumValue * 1000);
      clock.tick(num * updateTime);
      expect(timer.currentTime).to.be.equal(startValue);
      expect(called).to.be.equal(0);
      clock.restore();
    }));

    it('should be able to be resumed', sinon.test(function() {
      var clock = sinon.useFakeTimers();
      timer = new Utils.Timer(updateTime, timerFn, startValue);
      var called = 0;
      timer.start(function() { ++called; });

      timer.pause();

      var num = Math.floor(Math.random() * maximumValue * 1000);
      clock.tick(num * updateTime);
      expect(timer.currentTime).to.be.equal(startValue);
      expect(called).to.be.equal(0);

      timer.resume();

      num = Math.floor(Math.random() * numMaximumTimes);
      clock.tick(num * updateTime);
      expect(timer.currentTime).to.be.equal(num + startValue);
      expect(called).to.be.equal(num);

      clock.restore();
    }));

    it('should be able to set currentTime on going', sinon.test(function() {
      var clock = sinon.useFakeTimers();
      timer = new Utils.Timer(updateTime, timerFn, startValue);
      var called = 0;
      timer.start(function() { ++called; });

      var num = Math.floor(Math.random() * numMaximumTimes);
      clock.tick(num * updateTime);
      expect(timer.currentTime).to.be.equal(num + startValue);
      expect(called).to.be.equal(num);

      timer.currentTime = 0;
      expect(timer.currentTime).to.be.equal(0);

      clock.restore();
    }));
  });

  describe('#getPathname', function() {
    it('should exist and be a function', function() {
      expect(Utils.getPathname).to.exist;
      expect(Utils.getPathname).to.be.a('function');
    });

    it('should return the document.location.pathname', function() {
      expect(Utils.getPathname()).to.be.equal(document.location.pathname);
    });
  });

});
