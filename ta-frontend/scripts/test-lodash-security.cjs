const assert = require("node:assert/strict");
const { test } = require("node:test");
// Optional module path allows running the same checks against the base version.
const _ = require(process.env.LODASH_TEST_MODULE || "lodash");

for (const method of ["unset", "omit"]) {
  for (const wrapped of [false, true]) {
    test(`${method} preserves prototypes with ${wrapped ? "array-wrapped" : "string"} path segments`, () => {
      const marker = "__lodashSecurityMarker";
      Object.defineProperty(Object.prototype, marker, {
        value: "preserved",
        configurable: true,
      });
      try {
        const path = wrapped ? [["__proto__"], marker] : `__proto__.${marker}`;
        if (method === "omit") _.omit({}, [path]);
        else _.unset({}, path);
        assert.equal(Object.prototype[marker], "preserved");
      } finally {
        delete Object.prototype[marker];
      }
    });
  }
}

test("template rejects imports key injection before executing it", () => {
  globalThis.__lodashTemplateInjected = false;
  try {
    assert.throws(() =>
      _.template("safe", {
        imports: {
          "x = (globalThis.__lodashTemplateInjected = true)": undefined,
        },
      }),
    );
    assert.equal(globalThis.__lodashTemplateInjected, false);
  } finally {
    delete globalThis.__lodashTemplateInjected;
  }
});

test("template ignores inherited imports", () => {
  const imports = Object.create({ inherited: "unexpected" });
  assert.equal(
    _.template("<%= typeof inherited %>", { imports })({}),
    "undefined",
  );
});

test("supported template, object paths and application debounce remain compatible", () => {
  assert.equal(
    _.template("<%= greet(name) %>", {
      imports: { greet: (name) => `Hello ${name}` },
    })({ name: "QA3" }),
    "Hello QA3",
  );
  const value = { nested: { keep: 1, remove: 2 } };
  assert.deepEqual(_.omit(value, ["nested.remove"]), { nested: { keep: 1 } });
  assert.equal(_.unset(value, ["nested", "remove"]), true);
  assert.deepEqual(value, { nested: { keep: 1 } });
  const calls = [];
  const debounced = _.debounce((value) => calls.push(value), 500);
  debounced("first");
  debounced("latest");
  debounced.flush();
  assert.deepEqual(calls, ["latest"]);
  debounced("cancelled");
  debounced.cancel();
  debounced.flush();
  assert.deepEqual(calls, ["latest"]);
});
