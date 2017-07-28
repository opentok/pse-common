var assert = chai.assert;
var expect = chai.expect;
var should = chai.should();

describe('ie_polyfills', function() {

  var realStartsWith = null;
  var realEndsWith = null;
  var realCustomEvent = null;
  var realURL = null;
  var realFind = null;
  var realIntl = null;
  var realWeakMap = null;

  before(sinon.test(function(done) {
    realStartsWith = String.prototype.startsWith;
    String.prototype.startsWith = null;
    realEndsWith = String.prototype.endsWith;
    String.prototype.endsWith = null;
    realCustomEvent = window.CustomEvent;
    window.CustomEvent = null;
    realURL = window.URL;
    window.URL = {
      createObjectURL: function() {},
      revokeObjectURL: function() {},
    };
    // Snake case used intentionally here!
    Array.prototype.real_find = Array.prototype.find;
    Array.prototype.find = null;
    Array.prototype.real_findIndex = Array.prototype.findIndex;
    Array.prototype.findIndex = null;
    realIntl = window.Intl;
    window.Intl = null;
    realWeakMap = window.WeakMap;
    window.WeakMap = undefined;
    window.loadScript('js/libs/ie_polyfills.js', function() {
      done();
    });
  }));

  after(function() {
    String.prototype.startsWith = realStartsWith;
    String.prototype.endsWith = realEndsWith;
    window.CustomEvent = realCustomEvent;
    window.URL = realURL;
    Array.prototype.find = Array.prototype.real_find;
    Array.prototype.findIndex = Array.prototype.real_findIndex;
    window.Intl = realIntl;
    window.WeakMap = realWeakMap;
  });

  describe('#String.prototype.startsWith', function() {
    it('should be polyfilled', function() {
      expect(String.prototype.startsWith).to.exist;
      expect(String.prototype.startsWith).to.be.a('function');
    });

    var str = 'To be, or not to be, that is the question.';

    it('should return true when the string begins with the text', function() {
      var indexEnd = Math.floor(Math.random() * str.length);
      expect(str.startsWith(str.substring(0, indexEnd))).to.be.true;
    });

    it('should return false when the string does not begin with the text', function() {
      expect(str.startsWith(str.startsWith(str.substring(1, str.length)))).to.be.false;
    });
  });

  describe('#String.prototype.endsWith', function() {
    it('should be polyfilled', function() {
      expect(String.prototype.endsWith).to.exist;
      expect(String.prototype.endsWith).to.be.a('function');
    });

    var str = 'To be, or not to be, that is the question.';
    var indexStart = Math.floor(Math.random() * str.length);

    it('should return true when the string ends with the text', function() {
      expect(str.endsWith(str.substring(indexStart, str.length))).to.be.true;
    });

    it('should return false when the string does not end with the text', function() {
      expect(str.endsWith(str.substring(0, Math.floor(str.length / 2)))).to.be.false;
    });

    it('should return true when the string ends with the text given a length', function() {
      expect(str.endsWith(str.substring(indexStart, str.length), str.length)).to.be.true;
    });

    it('should return false when the string does not end with the text given a length', function() {
      expect(str.endsWith(str.substring(indexStart, str.length), str.length / 2)).to.be.false;
    });
  });

  describe('#window.location.origin', function() {
    it('should be polyfilled', function() {
      expect(window.location.origin).to.exist;
      expect(window.location.origin).to.be.a('string');
    });

    it('should return the origin', function() {
      var loc = window.location;
      expect(loc.origin).to.contains(loc.protocol + '//' + loc.host);
    });
  });

  describe('#window.CustomEvent', function() {
    it('should be polyfilled', function() {
      expect(window.CustomEvent).to.exist;
      expect(window.CustomEvent).to.be.a('function');
    });

    it('should define the event type and hold the detail', function() {
      var eventName = 'test';
      var data = {
        data: 'data'
      };

      var event = new CustomEvent(eventName, {
        detail: data
      });

      expect(event.type).to.be.equal(eventName);
      expect(event.detail).to.be.deep.equal(data);
    });

  });

  describe('#window.URL', function() {
    it('should be polyfilled', function() {
      expect(window.URL).to.exist;
      expect(window.URL).to.be.a('function');

      expect(window.URL.createObjectURL).to.exist;
      expect(window.URL.createObjectURL).to.be.a('function');

      expect(window.URL.revokeObjectURL).to.exist;
      expect(window.URL.revokeObjectURL).to.be.a('function');
    });

    it('should create an object with origin', function() {
      var url = new window.URL('https://tokbox.com/hc/en-us');
      expect(url.origin).to.be.equal('https://tokbox.com');
    });

    it('should fail when is not an URL', function(done) {
      try {
        new window.URL('ht://aa');
      } catch(ex) {
        expect(ex).to.exist;
        done();
      }
    });

  });

  describe('#Array.prototype changes', function() {

    var isPrime = (element, index, array) => {
      var start = 2;
      while (start <= Math.sqrt(element)) {
        if (element % start++ < 1) {
          return false;
        }
      }
      return element > 1;
    };
    var testCases = [
      {
        description: 'search by properties',
        input: [
          {
            name: 'apples',
            quantity: 2
          }, 
          {
            name: 'bananas',
            quantity: 0
          },
          {
          name: 'cherries',
          quantity: 5
          }
        ],
        predicate: fruit => fruit.name === 'cherries'
      },
      {
        description: 'search by value, and not find it',
        input: [4, 6, 8, 12],
        predicate: isPrime
      },
      {
        description: 'search by value, and find it',
        input: [4, 6, 5, 8, 12],
        predicate: isPrime
      },
    ];

    var methods = ['find', 'findIndex'];

    methods.forEach(aMethod => {
      describe('#Array.prototype.' + aMethod, function() {
        it('should be polyfilled', function() {
          expect(Array.prototype[aMethod]).to.exist;
          expect(Array.prototype[aMethod]).to.be.a('function');
        });

      testCases.forEach(aCase => {
        it('should ' + aCase.description, function() {
          expect(aCase.input[aMethod](aCase.predicate)).
            to.be.equals(aCase.input['real_' + aMethod](aCase.predicate));
        });
      });

      it('should fail when predicate is not a function', function(done) {
        try {
          Array.prototype[aMethod].apply([], null);
        } catch(ex) {
          expect(ex).to.exist;
          done();
        }
      });

      it('should fail when called on null', function(done) {
        try {
          Array.prototype[aMethod].apply(null, function() {});
        } catch(ex) {
          expect(ex).to.exist;
          done();
        }
      });

      it('should fail when called on undefined', function(done) {
        try {
          Array.prototype[aMethod].apply(undefined, function() {});
        } catch(ex) {
          expect(ex).to.exist;
          done();
        }
      });
    });
    });
  
  });

  describe('#window.Intl', function() {

    it('should be polyfilled', function() {
      expect(window.Intl).to.exist;
      expect(window.Intl).to.be.a('object');

      expect(window.Intl.DateTimeFormat).to.exist;
      expect(window.Intl.DateTimeFormat).to.be.a('function');
    });

    it('should return the date with an specific format', sinon.test(function() {
      var hours = Math.round(Math.random() * 23);
      var minutes = Math.round(Math.random() * 59);

      this.stub(window, 'Date', function() {
        return {
          getHours: function() {
            return parseInt('' + hours);
          },
          getMinutes: function() {
            return parseInt('' + minutes);
          }
        }
      });

      var dateTimeFormat = new window.Intl.DateTimeFormat('en', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      });

      var formattedDate = dateTimeFormat.format(new Date());

      var result = [];
      var suffix = ' AM';
      if (hours > 12) {
        suffix = ' PM';
        hours = hours - 12;
      }
      hours < 10 && result.push('0');
      result.push(hours);
      result.push(':');
      minutes < 10 && result.push('0');
      result.push(minutes);
      result.push(suffix);
      expect(formattedDate).to.be.equal(result.join(''));
    }));

  });

  describe('#window.WeakMap', function() {
    var wm = null;
    var key = {};
    var value = 37;

    it('should be polyfilled', function() {
      expect(window.WeakMap).to.exist;
      expect(window.WeakMap).to.be.a('function');

      wm = new window.WeakMap();

      expect(wm.set).to.exist;
      expect(wm.set).to.be.a('function');

      expect(wm.get).to.exist;
      expect(wm.get).to.be.a('function');

      expect(wm.delete).to.exist;
      expect(wm.delete).to.be.a('function');

      expect(wm.has).to.exist;
      expect(wm.has).to.be.a('function');
    });

    describe('#set', function() {
      it('should set the value for the key in the WeakMap object and return the WeakMap object',
        function() {
        expect(wm.set(key, value)).to.be.equal(wm);
      });
    });

    describe('#get', function() {
      it('should return the value associated to the key', function() {
        expect(wm.get(key)).to.be.equal(value);
      });

      it('should return undefined if there is none', function() {
        expect(wm.get('')).to.be.undefined;
      });
    });

    describe('#has', function() {
      it('should return a Boolean asserting whether a value has been associated to the key in ' +
         'the WeakMap object or not', function() {
        expect(wm.has(key)).to.be.true;
        expect(wm.has('')).to.be.false;
      });
    });

    describe('#delete', function() {
      it('should remove any value associated to the key', function() {
        expect(wm.delete(key)).to.be.true;
        expect(wm.has(key)).to.be.false;
        expect(wm.delete('')).to.be.false;
      });
    });

  });
});
