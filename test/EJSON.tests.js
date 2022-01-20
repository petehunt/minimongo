const EJSON = require("../src/EJSON");
const { expect } = require("chai");
const { randomHex } = require("./helpers/randomHex");

const falsyValues = [null, undefined, "", false, 0];
const truthyValues = [[], {}, [{}], 1, true, "foo", () => {}];
const nonEJSONValues = falsyValues.concat(truthyValues);
const nonCustomValues = nonEJSONValues.concat(new Date());
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
      unit: this.unit,
    };
  }

  clone() {
    return new Distance(this.value, this.unit);
  }

  equals(b) {
    return (
      b &&
      b.value === this.value &&
      b.unit === this.unit &&
      b instanceof Distance
    );
  }

  // Unique type name.
  typeName() {
    return "Distance";
  }
}

describe("EJSON", function () {
  before(function () {
    EJSON.addType("Distance", function fromJSONValue(json) {
      return new Distance(json.value, json.unit);
    });
  });
  describe(EJSON.addType.name, function () {
    it("adds a new type or throws if a type is already present", function () {
      const type = randomHex();
      const factory = () => {};

      EJSON.addType(type, factory); // should pass

      expect(() => EJSON.addType(type, factory)).to.throw(
        `Type ${type} already present`
      );
    });
  });
  describe(EJSON._isCustomType.name, function () {
    it("returns, whether an obj is a custom EJSON type", function () {
      expect(EJSON._isCustomType(new Distance(10, "m"))).to.equal(true);

      nonCustomValues.forEach((val) => {
        const isCustomType = EJSON._isCustomType(val);
        console.debug(val, isCustomType);
        expect(isCustomType).to.equal(false);
      });
    });
  });
  describe(EJSON.fromJSONValue.name, function () {
    it("deserialized EJSON-compatible value into it's original", function () {
      const d = new Date();
      const value = {
        $date: d.getTime(),
      };
      const d2 = EJSON.fromJSONValue(value);
      expect(d2).to.be.instanceOf(Date);
      expect(EJSON.equals(d, d2)).to.equal(true);

      const binary1 = Uint8Array.from("45465768654323456");
      const valueBin = {
        $binary: "BAUEBgUHBggGBQQDAgMEBQY=",
      };
      const binary2 = EJSON.fromJSONValue(valueBin);
      expect(binary2).to.be.instanceOf(Uint8Array);
      expect(EJSON.equals(binary1, binary2)).to.equal(true);

      const valueEsc = {
        foo: {
          $escape: {
            $type: "Distance",
            $value: {
              value: 10,
              unit: "m",
            },
          },
        },
      };
      expect(EJSON.fromJSONValue(valueEsc)).to.deep.equal({
        foo: EJSON.toJSONValue(new Distance(10, "m")),
      });
    });
    it("ignores other types", function () {
      expect(EJSON.fromJSONValue(null)).to.deep.equal(null);
      expect(EJSON.fromJSONValue({ foo: "bar" })).to.deep.equal({ foo: "bar" });
    });
  });
  describe(EJSON.toJSONValue.name, function () {
    it("serializes an EJSON-compatible value into its plain JSON representation.", function () {
      const plain = EJSON.toJSONValue(new Distance(10, "m"));
      expect(plain).to.deep.equal({
        $type: "Distance",
        $value: {
          value: 10,
          unit: "m",
        },
      });

      const d = new Date();
      expect(EJSON.toJSONValue(d)).to.deep.equal({
        $date: d.getTime(),
      });

      const escape = { foo: EJSON.toJSONValue(new Distance(10, "m")) };
      expect(EJSON.toJSONValue(escape)).to.deep.equal({
        foo: {
          $escape: {
            $type: "Distance",
            $value: {
              value: 10,
              unit: "m",
            },
          },
        },
      });

      const binary1 = Uint8Array.from("45465768654323456");
      expect(EJSON.toJSONValue(binary1)).to.deep.equal({
        $binary: "BAUEBgUHBggGBQQDAgMEBQY=",
      });

      // TODO use non-ascii multibyte data, too
    });
    it("ignores values that are not EJSON-compatible", function () {
      const obj = {
        a: function () {},
        b: "foo",
      };
      expect(EJSON.toJSONValue(obj)).to.deep.equal(obj);

      nonEJSONValues.forEach((val) => {
        expect(EJSON.toJSONValue(val)).to.deep.equal(val);
      });
    });
  });
  describe(EJSON.stringify.name, function () {
    it("serializes an ESJON-compatible type to string", function () {
      const str = EJSON.stringify(new Distance(10, "m"));
      expect(str).to.equal(
        '{"$type":"Distance","$value":{"value":10,"unit":"m"}}'
      );
    });
    it("serializes non-ESJON-compatible type to string like JSON.stringify", function () {
      const obj = {
        a: function () {},
        b: "foo",
      };
      expect(EJSON.stringify(obj)).to.equal('{"b":"foo"}');

      nonEJSONValues.forEach((val) => {
        expect(EJSON.stringify(val)).to.equal(JSON.stringify(val));
      });
    });
  });
  describe(EJSON.parse.name, function () {
    it("parses an EJSON-compatible type into the correct class-instance", function () {
      const str = '{"$type":"Distance","$value":{"value":10,"unit":"m"}}';
      const obj = EJSON.parse(str);
      expect(obj).to.be.instanceof(Distance);
      expect(obj).to.deep.equal({
        unit: "m",
        value: 10,
      });
    });
    it("behaves like JSON.parse for all other types", function () {
      const str = '{"type":"Distance","value":{"value":10,"unit":"m"}}';
      const obj = EJSON.parse(str);
      expect(obj).to.be.not.instanceof(Distance);
      expect(obj).to.deep.equal({
        type: "Distance",
        value: {
          unit: "m",
          value: 10,
        },
      });
    });
  });
  describe(EJSON.equals.name, function () {
    it("returns true if a and b are equal to each other", function () {
      nonEJSONValues.forEach((val) => {
        expect(EJSON.equals(val, val)).to.equal(true);
      });

      const d1 = new Distance(10, "m");
      const d2 = new Distance(10, "m");
      expect(EJSON.equals(d1, d2)).to.equal(true);
      expect(EJSON.equals(d1, d1)).to.equal(true);

      const date1 = new Date();
      const date2 = new Date(date1);
      expect(EJSON.equals(date1, date2)).to.equal(true);

      const date3 = new Date(date1.getTime() + 1);
      expect(EJSON.equals(date1, date3)).to.equal(false);

      const a1 = [0, 1, 2, 3, 4];
      const a2 = [0, 1, 2, 3, 4];
      expect(EJSON.equals(a1, a2)).to.equal(true);

      const o1 = { foo: "bar" };
      const o2 = { foo: "bar" };
      expect(EJSON.equals(o1, o2)).to.equal(true);

      const o3 = { foo: "bar", bar: "baz" };
      const o4 = { bar: "baz", foo: "bar" };
      expect(EJSON.equals(o3, o4)).to.equal(true);

      const binary1 = Uint8Array.from("45465768654323456");
      const binary2 = Uint8Array.from("45465768654323456");
      expect(EJSON.equals(binary1, binary2)).to.equal(true);
    });
    it("returns false otherwise.", function () {
      nonEJSONValues.forEach((val) => {
        falsyValues.forEach((falsy) => {
          if (falsy === val) return;
          expect(EJSON.equals(falsy, val)).to.equal(false);
          expect(EJSON.equals(val, falsy)).to.equal(false);
        });

        truthyValues.forEach((truthy) => {
          if (truthy === val) return;
          expect(EJSON.equals(truthy, val)).to.equal(false);
          expect(EJSON.equals(val, truthy)).to.equal(false);
        });
      });
      const d1 = new Distance(10, "m");
      const d2 = new Distance(11, "m");
      expect(EJSON.equals(d1, d2)).to.equal(false);

      const d3 = { value: 10, unit: "m" };
      expect(EJSON.equals(d1, d3)).to.equal(false);

      const a1 = [0, 1, 2, 3, 4];
      const a2 = [0, 1, 2, 3, 4, 5];
      expect(EJSON.equals(a1, a2)).to.equal(false);

      const o1 = { foo: "bar" };
      const o2 = { foo: "bar1" };
      const o3 = { foo: "bar", bar: "baz" };
      const o4 = { bar: "baz" };

      expect(EJSON.equals(o1, o2)).to.equal(false);
      expect(EJSON.equals(o1, o3)).to.equal(false);
      expect(EJSON.equals(o1, o4)).to.equal(false);

      const options = { keyOrderSensitive: true };

      expect(EJSON.equals(o1, o2, options)).to.equal(false);
      expect(EJSON.equals(o1, o3, options)).to.equal(false);
      expect(EJSON.equals(o1, o4, options)).to.equal(false);

      // keyordersensitive
      const o5 = { bar: "baz", foo: "bar" };
      expect(EJSON.equals(o3, o5, options)).to.equal(false);

      const o6 = { foo: "bar", bar: "baz", baz: "foo" };
      expect(EJSON.equals(o3, o6, options)).to.equal(false);

      const binary1 = Uint8Array.from("45465768654323456");
      const binary2 = Uint8Array.from("45465768654323452");
      const binary3 = Uint8Array.from("4546576865432345");
      expect(EJSON.equals(binary1, binary2)).to.equal(false);
      expect(EJSON.equals(binary1, binary3)).to.equal(false);
    });
    it("uses equals if implemented", function () {
      const d1 = new Distance(10, "m");
      const d2 = new Distance(10, "m");
      expect(d1.equals).to.be.a("function");
      delete d1.equals;
      expect(EJSON.equals(d1, d2)).to.equal(true);

      const d3 = { value: 10, unit: "m" };
      expect(EJSON.equals(d1, d3)).to.equal(false);
    });
  });
  describe(EJSON.clone.name, function () {
    it("returns a deep copy", function () {
      const d1 = new Distance(10, "m");
      const d2 = EJSON.clone(d1);
      expect(d1).to.deep.equal(d2);

      const date1 = new Date();
      const date2 = EJSON.clone(date1);

      expect(EJSON.equals(date1, date2)).to.equal(true);

      const dist1 = new Distance(10, "m");
      const dist2 = EJSON.clone(dist1);

      expect(EJSON.equals(dist1, dist2)).to.equal(true);

      const binary1 = Uint8Array.from("45465768654323456");
      const binary2 = EJSON.clone(binary1);
      expect(EJSON.equals(binary1, binary2)).to.equal(true);
    });
  });
  describe(EJSON.isBinary.name, function () {
    it("detects binary types", function () {
      const binary = Uint8Array.from("45465768654323456");
      expect(EJSON.isBinary(binary)).to.equal(true);
    });
  });
});
