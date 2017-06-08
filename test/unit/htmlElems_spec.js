var assert = chai.assert;
var expect = chai.expect;
var should = chai.should();

describe('HTMLElems', function() {

  it('should exist', function() {
    expect(HTMLElems).to.exist;
  });

  describe('#isAction', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.isAction).to.exist;
      expect(HTMLElems.isAction).to.be.a('function');
    });

    it('should return true when the element represents an action', function() {
      var element = document.createElement('div');
      element.dataset.action = 'myAction';
      expect(HTMLElems.isAction(element)).to.be.true;
    });

    it('should return false when the element does not represent an action', function() {
      var element = document.createElement('div');
      expect(HTMLElems.isAction(element)).to.be.false;
    });
  });

  describe('#setEnabled', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.setEnabled).to.exist;
      expect(HTMLElems.setEnabled).to.be.a('function');
    });

    it('should add enabled class when is enabled', function() {
      var element = document.createElement('div');
      expect(element.classList.contains('enabled')).to.be.false;
      HTMLElems.setEnabled(element, true);
      expect(element.classList.contains('enabled')).to.be.true;
    });

    it('should remove enabled class when is not enabled', function() {
      var element = document.createElement('div');
      expect(element.classList.contains('enabled')).to.be.false;
      HTMLElems.setEnabled(element, false);
      expect(element.classList.contains('enabled')).to.be.false;
    });
  });

  describe('#getAncestorByTagName', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.getAncestorByTagName).to.exist;
      expect(HTMLElems.getAncestorByTagName).to.be.a('function');
    });

    it('should return the closer ancestor by tag name', function() {
      var div = document.createElement('div');
      var span = document.createElement('span');
      div.appendChild(span);
      document.body.appendChild(div);
      expect(HTMLElems.getAncestorByTagName(span, 'div')).to.be.equal(div);
    });

    it('should be case insensitive', function() {
      var div = document.createElement('div');
      var span = document.createElement('span');
      div.appendChild(span);
      document.body.appendChild(div);
      expect(HTMLElems.getAncestorByTagName(span, 'DiV')).to.be.equal(div);
    });

    it('should return null when there is not matching', function() {
      var div = document.createElement('div');
      var span = document.createElement('span');
      div.appendChild(span);
      document.body.appendChild(div);
      expect(HTMLElems.getAncestorByTagName(span, 'PeRaS')).to.be.null;
    });

  });

  describe('#flush', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.flush).to.exist;
      expect(HTMLElems.flush).to.be.a('function');
    });

  });

  describe('#addText', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.addText).to.exist;
      expect(HTMLElems.addText).to.be.a('function');
    });

    it('should add text to a DOM element', function() {
      var elem = document.createElement('span');
      expect(elem.textContent).to.be.equal('');
      var expectedText = 'This is a text';
      HTMLElems.addText(elem, expectedText);
      expect(elem.textContent).to.be.equal(expectedText);
    });
  });

  describe('#replaceText', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.replaceText).to.exist;
      expect(HTMLElems.replaceText).to.be.a('function');
    });

    it('should replace text to a DOM element', function() {
      var elem = document.createElement('span');
      var expectedText = 'This is a text';
      HTMLElems.addText(elem, expectedText);
      HTMLElems.replaceText(elem, expectedText + expectedText);
      expect(elem.textContent).to.be.equal(expectedText + expectedText);
    });
  });

  describe('#createElement', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.createElement).to.exist;
      expect(HTMLElems.createElement).to.be.a('function');
    });

    it('should create DOM elements without attrs and text', function() {
      var type = 'div';
      var elem = HTMLElems.createElement(type);
      expect(elem.tagName.toLowerCase()).to.be.equal(type);
    });

    it('should create DOM elements with attrs', function() {
      var attrs = {
        pepe: 'pepe',
        'data-pepe': 'data-pepe'
      };
      var elem = HTMLElems.createElement('div', attrs);
      expect(elem.getAttribute('pepe')).to.be.equal(attrs['pepe']);
      expect(elem.dataset.pepe).to.be.equal(attrs['data-pepe']);
    });

    it('should create DOM elements with text', function() {
      var expectedText = 'This is a text';
      var elem = HTMLElems.createElement('div', null, expectedText);
      expect(elem.textContent).to.be.equal(expectedText);
    });
  });

  describe('#createElementAt', function() {
    it('should exist and be a function', function() {
      expect(HTMLElems.createElementAt).to.exist;
      expect(HTMLElems.createElementAt).to.be.a('function');
    });

    it('should create DOM elements and append to target element', function() {
      var target = document.createElement('div');
      var elem = HTMLElems.createElementAt(target, 'div');
      expect(elem).to.be.equal(target.children[0]);
    });

    it('should create DOM elements and append to target element before defined child', function() {
      var target = document.createElement('div');
      var child = document.createElement('div');
      target.appendChild(child);
      var elem = HTMLElems.createElementAt(target, 'div', null, null, child);
      expect(target.children.length).to.be.equal(2);
      expect(elem).to.be.equal(target.children[0]);
      expect(child).to.be.equal(target.children[1]);
    });

  });

});
