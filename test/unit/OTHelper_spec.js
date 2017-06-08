var expect = chai.expect;

describe('OTHelper', function() {

  var realLazyLoader = null;

  var realOT = null;

  var session = {
    connect: function(token, cb) { cb(); },
    disconnect: function() {},
    signal: function() {},
    on: function() {},
    off: function() {},
    publish: function(pPublisher, cb) { cb(); }
  };

  var publisher = {
    on: function() {},
    off: function() {},
    destroy: function() {}
  };

  before(function(done) {
    realLazyLoader = window.LazyLoader;
    window.LazyLoader = {
      dependencyLoad: function() { return Promise.resolve(); },
      load: function() { return Promise.resolve(); }
    };
    realOT = window.OT;
    window.OT = {
      checkSystemRequirements: function() {
        return true;
      },
      registerScreenSharingExtension: function() {},
      getDevices: function() {},
      initSession: function() { return session; },
      initPublisher: function(aDOMElement, aProps, aCb) {
        Promise.resolve().then(function() { aCb(); });
        return publisher;
      }
    };
    window.loadScript('js/helpers/OTHelper.js', function() {
      done();
    });
  });

  after(function() {
    window.LazyLoader = realLazyLoader;
    window.OT = realOT;
  });

  var sessionInfo = {
    apiKey: '45879712',
    sessionId: '1_MX40NTg3OTcxMn5-MTQ5NjgyMjg5NjM2M34wKzkzdmJ0NDNRekljejdzQW5sVlJrWU9-fg',
    token: 'T1==cGFydG5lcl9pZD00NTg3OTcxMiZzaWc9Zjc4NzBjODdlYTgwZmNmOTAwZTEwYTBiODA3MzFjN2I4YWNjN='
  };

  it('should exist', function() {
    expect(OTHelper).to.exist;
    expect(OTHelper).to.be.function;
  });

  describe('#connect', function() {
    var instance = null;

    beforeEach(function() {
      instance = new OTHelper(sessionInfo);
    });

    it('should exist', function() {
      expect(instance.connect).to.exist;
      expect(instance.connect).to.be.function;
    });

    it('should return an error when there is not apiKey', function(done) {
      instance = new OTHelper({
        sessionId: '1',
        token: 'T'
      });

      instance.connect().catch(function(e) {
        expect(e.message).to.contains('Invalid parameters received');
        done();
      });
    });

    it('should return an error when there is not sessionId', function(done) {
      instance = new OTHelper({
        apiKey: '1',
        token: 'T'
      });

      instance.connect().catch(function(e) {
        expect(e.message).to.contains('Invalid parameters received');
        done();
      });
    });

    it('should return an error when there is not token', function(done) {
      instance = new OTHelper({
        apiKey: '1',
        sessionId: 'T'
      });

      instance.connect().catch(function(e) {
        expect(e.message).to.contains('Invalid parameters received');
        done();
      });
    });

    it('should connect to session without handlers', sinon.test(function(done) {
      this.stub(session, 'connect', function(token, cb) {
        expect(token).to.be.equal(sessionInfo.token);
        cb();
      });

      this.spy(session, 'off');

      this.stub(OT, 'initSession', function(apiKey, sessionId) {
        expect(apiKey).to.be.equal(sessionInfo.apiKey);
        expect(sessionId).to.be.equal(sessionInfo.sessionId);
        return session;
      });

      instance.connect().then(function(pSession) {
        expect(pSession).to.be.deep.equal(session);
        expect(session.off.called).to.be.true;
        done();
      });
    }));

    it('should connect to session and add regular and intercepted handlers',
      sinon.test(function(done) {
      this.spy(session, 'on');

      var handlers = {
        'signal:a': function() {},
        'foo:bar': function() {}
      };

      instance.connect([handlers]).then(function() {
        expect(session.on.calledTwice).to.be.true;
        expect(session.on.firstCall.args[0]['foo:bar']).to.exist;
        expect(session.on.secondCall.args[0]['signal:a']).to.exist;
        done();
      });
    }));

    it('should return an error while connecting fails', sinon.test(function(done) {
      var expectedError = {
        foo: 'bar'
      };

      this.stub(session, 'connect', function(token, cb) {
        cb(expectedError);
      });

      instance.connect().catch(function(e) {
        expect(e).to.be.deep.equal(expectedError);
        done();
      });
    }));
  });

  describe('#disconnect', function() {
    var instance = null;

    before(function(done) {
      instance = new OTHelper(sessionInfo);
      instance.connect().then(function() {
        done();
      })
    });

    it('should exist', function() {
      expect(instance.disconnect).to.exist;
      expect(instance.disconnect).to.be.function;
    });

    it('should disconnect', sinon.test(function() {
      this.spy(session, 'disconnect');

      instance.disconnect();

      expect(session.disconnect.calledOnce).to.be.true;
    }));
  });

  describe('#publish', function() {
    var instance = null;

    var targetElem = null;

    var properties = {
      foo: 'bar'
    };

    var handlers = {
      a: function() {},
      b: function() {}
    };

    before(function(done) {
      targetElem = document.createElement('div')
      instance = new OTHelper(sessionInfo);
      instance.connect().then(function() {
        done();
      })
    });

    it('should exist', function() {
      expect(instance.publish).to.exist;
      expect(instance.publish).to.be.function;
    });

    it('should initialize the publisher and publish', sinon.test(function(done) {
      this.spy(publisher, 'on');

      this.stub(session, 'publish', function(pPublisher, cb) {
        expect(pPublisher).to.be.deep.equal(publisher);
        cb();
      });

      this.stub(OT, 'initPublisher', function(elem, props, cb) {
        expect(elem).to.be.equal(targetElem);
        expect(props).to.be.deep.equal(properties);
        Promise.resolve().then(function() {
          cb();
        });
        return publisher;
      });

      instance.publish(targetElem, properties, handlers).then(function(pPublisher) {
        expect(pPublisher).to.be.deep.equal(publisher);
        Object.keys(handlers).forEach(function(name, index) {
          expect(publisher.on.getCall(index).args[0]).to.be.equal(name);
        });
        done();
      });
    }));

    it('should reject when publisher fails initializing', sinon.test(function(done) {
      var expectedError = {
        name: 'name',
        message: 'message'
      };

      this.stub(session, 'publish', function(pPublisher, cb) {
        cb(expectedError);
      });

      instance.publish(targetElem, properties, handlers).catch(function(e) {
        expect(e.error).to.be.deep.equal(expectedError);
        done();
      });
    }));

    it('should reject when publisher fails publishing', sinon.test(function(done) {
      var expectedError = {
        name: 'name',
        message: 'message'
      };

      this.stub(OT, 'initPublisher', function(elem, props, cb) {
        cb(expectedError);
      });

      instance.publish(targetElem, properties, handlers).catch(function(e) {
        expect(e.error).to.be.deep.equal({
          name: expectedError.name,
          message: 'Error initializing publisher: ' + expectedError.message
        });
        done();
      });
    }));
  });

  describe('#destroyPublisher', function() {
    var instance = null;

    beforeEach(function(done) {
      targetElem = document.createElement('div')
      instance = new OTHelper(sessionInfo);
      instance.connect().
        then(function() {
          return instance.publish(null, {}, {});
        }).
        then(function() {
          done();
        });
    });

    it('should exist', function() {
      expect(instance.destroyPublisher).to.exist;
      expect(instance.destroyPublisher).to.be.function;
    });

    it('should destroy the publisher', sinon.test(function() {
      this.spy(publisher, 'destroy');

      instance.destroyPublisher();

      expect(publisher.destroy.calledOnce).to.be.true;
    }));

    it('should destroy the publisher only once', sinon.test(function() {
      this.spy(publisher, 'destroy');

      var total = Math.round(Math.random() * 10) + 2;
      for (var i = 0; i < total; i++) {
        instance.destroyPublisher();
      }

      expect(publisher.destroy.calledOnce).to.be.true;
    }));
  });

  describe('#isMyself', function() {
    var instance = null;

    var myConnectionId = 'myConnectionId';

    before(sinon.test(function(done) {
      this.stub(OT, 'initSession', function(apiKey, sessionId) {
        expect(apiKey).to.be.equal(sessionInfo.apiKey);
        expect(sessionId).to.be.equal(sessionInfo.sessionId);
        return {
          connect: function(token, cb) { cb(); },
          off: function() {},
          connection: {
            connectionId: myConnectionId
          }
        };
      });
      instance = new OTHelper(sessionInfo);
      instance.connect().then(function() {
        done();
      })
    }));

    it('should exist', function() {
      expect(instance.isMyself).to.exist;
      expect(instance.isMyself).to.be.function;
    });

    it('should return true when it is my connection', function() {
      expect(instance.isMyself({
        connectionId: myConnectionId
      })).to.be.true;
    });

    it('should return false when it the connection belongs others', function() {
      expect(instance.isMyself({
        connectionId: 'otherConnectionId'
      })).to.be.false;
    });
  });

  describe('#off', function() {
    var instance = null;

    before(function(done) {
      instance = new OTHelper(sessionInfo);
      instance.connect().then(function() {
        done();
      })
    });

    it('should exist', function() {
      expect(instance.off).to.exist;
      expect(instance.off).to.be.function;
    });

    it('should remove all event handlers', sinon.test(function() {
      this.spy(session, 'off');

      instance.off();

      expect(session.off.calledOnce).to.be.true;
    }));
  });

  describe('#getDevices', function() {
    var instance = null;

    before(function() {
      instance = new OTHelper(sessionInfo);
    });

    it('should exist', function() {
      expect(instance.getDevices).to.exist;
      expect(instance.getDevices).to.be.function;
    });

    it('should return a list of devices', sinon.test(function(done) {
      var expectedDevices = {
        foo: 'bar'
      };

      this.stub(OT, 'getDevices', function(cb) {
        cb(null, expectedDevices);
      });

      instance.getDevices().then(function(devices) {
        expect(devices).to.be.deep.equal(expectedDevices);
        done();
      });
    }));

    it('should return an error when fails list of devices', sinon.test(function(done) {
      var expectedError = {
        foo: 'bar'
      };

      this.stub(OT, 'getDevices', function(cb) {
        cb(expectedError);
      });

      instance.getDevices().then().catch(function(e) {
        expect(e).to.be.deep.equal(expectedError);
        done();
      });
    }));
  });

  describe('#screenShareErrorCodes', function() {
    it('should exist', function() {
      expect(OTHelper.screenShareErrorCodes).to.exist;
      expect(OTHelper.screenShareErrorCodes).to.be.object;
    });
  });

  describe('#registerScreenShareExtension', function() {
    it('should exist', function() {
      expect(OTHelper.registerScreenShareExtension).to.exist;
      expect(OTHelper.registerScreenShareExtension).to.be.function;
    });

    var aParams = {
      'a': {
        foo: 'bar'
      },
      'b': {
        bar: 'foo'
      }
    };

    it('should register screen share extenstion with version', sinon.test(function() {
      this.spy(OT, 'registerScreenSharingExtension');
      var version = Math.floor(Math.random() * 10) + 1;
      OTHelper.registerScreenShareExtension(aParams, version);
      expect(OT.registerScreenSharingExtension.callCount).to.be.equal(Object.keys(aParams).length);
      Object.keys(aParams).forEach(function(aKey, index) {
        expect(OT.registerScreenSharingExtension.getCall(index).args[0]).to.be.equal(aKey);
        expect(OT.registerScreenSharingExtension.getCall(index).args[1]).to.be.equal(aParams[aKey]);
        expect(OT.registerScreenSharingExtension.getCall(index).args[2]).to.be.equal(version);
      });
    }));

    it('should register screen share extenstion with version 2 by default', sinon.test(function() {
      this.spy(OT, 'registerScreenSharingExtension');
      OTHelper.registerScreenShareExtension(aParams);
      Object.keys(aParams).forEach(function(aKey, index) {
        expect(OT.registerScreenSharingExtension.getCall(index).args[2]).to.be.equal(2);
      });
    }));
  });

});
