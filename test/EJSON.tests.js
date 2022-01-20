const EJSON = require('../src/EJSON')
const { expect } = require('chai');
const { randomHex } = require('./helpers/randomHex')

/*
 * This is our test class
 */
class Distance {
  constructor(value, unit) {
    this.value = value;
    this.unit = unit;
  }

  // Convert our type to JSON.
  toJSONValue() {
    return {
      value: this.value,
      unit: this.unit
    };
  }

  equals (b) {
    return b && b.value === this.value && b.unit === this.unit && b instanceof Distance
  }

  // Unique type name.
  typeName() {
    return 'Distance';
  }
}

describe('EJSON', function () {
  before(function () {
    EJSON.addType('Distance', function fromJSONValue(json) {
      return new Distance(json.value, json.unit);
    });
  })
  describe(EJSON.addType.name, function () {
    it('adds a new type or throws if a type is already present', function () {
      const type = randomHex()
      const factory = () => {}

      EJSON.addType(type, factory) // should pass

      expect(() => EJSON.addType(type, factory))
        .to.throw(`Type ${type} already present`)
    })
  })
  describe(EJSON._isCustomType.name, function () {
    it('returns, whether an obj is a custom EJSON type', function () {
      expect(EJSON._isCustomType(new Distance(10, 'm'))).to.equal(true)
      expect(EJSON._isCustomType({})).to.equal(false)
    })
  })
  describe(EJSON.toJSONValue.name, function () {
    it('serializes an EJSON-compatible value into its plain JSON representation.', function () {
      const plain = EJSON.toJSONValue(new Distance(10, 'm'))
      expect(plain).to.deep.equal({
        $type: "Distance",
        $value: {
          value: 10,
          unit: 'm'
        }
      })
    })
    it('ignores values that are not EJSON-compatible', function () {
      const obj = {
        a: function () {},
        b: 'foo'
      }
      expect(EJSON.toJSONValue(obj)).to.deep.equal(obj)
    })
  })
  describe(EJSON.stringify.name, function () {
    it('serializes an ESJON-compatible type to string', function () {
      const str = EJSON.stringify(new Distance(10, 'm'))
      expect(str).to.equal("{\"$type\":\"Distance\",\"$value\":{\"value\":10,\"unit\":\"m\"}}")
    })
    it('serializes non-ESJON-compatible type to string like JSON.stringify', function () {
      const obj = {
        a: function () {},
        b: 'foo'
      }
      expect(EJSON.stringify(obj)).to.equal("{\"b\":\"foo\"}")
    })
  })
  describe(EJSON.parse.name, function () {
    it('parses an EJSON-compatible type into the correct class-instance', function () {
      const str = "{\"$type\":\"Distance\",\"$value\":{\"value\":10,\"unit\":\"m\"}}"
      const obj = EJSON.parse(str)
      expect(obj).to.be.instanceof(Distance)
      expect(obj).to.deep.equal({
        unit: 'm',
        value: 10
      })
    })
    it('behaves like JSON.parse for all other types', function () {
      const str = "{\"type\":\"Distance\",\"value\":{\"value\":10,\"unit\":\"m\"}}"
      const obj = EJSON.parse(str)
      expect(obj).to.be.not.instanceof(Distance)
      expect(obj).to.deep.equal({
        type: 'Distance',
        value: {
          unit: 'm',
          value: 10
        }
      })
    })
  })
  describe(EJSON.equals.name, function () {
    it('returns true if a and b are equal to each other', function () {
      const d1 = new Distance(10, 'm')
      const d2 = new Distance(10, 'm')
      expect(EJSON.equals(d1, d2)).to.equal(true)
    })
    it('returns false otherwise.', function () {
      const d1 = new Distance(10, 'm')
      const d2 = new Distance(11, 'm')
      expect(EJSON.equals(d1, d2)).to.equal(false)

      const d3 = { value: 10, unit: 'm'}
      expect(EJSON.equals(d1, d3)).to.equal(false)
    })
    it('uses equals if implemented', function () {
      const d1 = new Distance(10, 'm')
      const d2 = new Distance(10, 'm')
      expect(d1.equals).to.be.a('function')
      delete d1.equals
      expect(EJSON.equals(d1, d2)).to.equal(true)

      const d3 = { value: 10, unit: 'm'}
      expect(EJSON.equals(d1, d3)).to.equal(false)
    })
  })
  describe(EJSON.clone.name, function () {
    it('returns a deep copy', function () {
      const d1 = new Distance(10, 'm')
      const d2 = EJSON.clone(d1)
      expect(d1).to.deep.equal(d2)
    })
  })
})
