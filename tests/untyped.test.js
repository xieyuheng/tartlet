import test from "ava"
import * as ut from "cell-complex/lib/util"
import { result_t, ok_t, err_t } from "cell-complex/lib/result"
import * as cc from "../lib/untyped/core"
import {
  MODULE,
  VAR, LAMBDA, APPLY,
} from "../lib/untyped/syntax"

test ("exp.eval", t => {
  LAMBDA ("x", LAMBDA ("y", VAR ("y")))
    .eval (new cc.env_t ())

  APPLY (LAMBDA ("x", VAR ("x")), LAMBDA ("x", VAR ("x")))
    .eval (new cc.env_t ())

  t.pass ()
})

test ("freshen", t => {
  let x = "x"

  t.deepEqual (
    cc.freshen (new Set (["x", "x*"]), x),
    "x**")

  t.pass ()
})

test ("read_back", t => {
  let value = APPLY (
    LAMBDA ("x", LAMBDA ("y", APPLY (VAR ("x"), VAR ("y")))),
    LAMBDA ("x", VAR ("x")))
    .eval (new cc.env_t ())
  let exp = value.read_back (new Set ())

  t.true (exp.eq (LAMBDA ("y", VAR ("y"))))
})

test ("module.define", t => {
  let m = MODULE ()
  m.define ("id", LAMBDA ("x", VAR ("x")))
  m.run (VAR ("id"))
  m.run (LAMBDA ("x", VAR ("x")))

  t.pass ()
})

test ("church", t => {
  let m = MODULE ()
  m.use (cc.church)
  m.run (cc.to_church (0))
  m.run (cc.to_church (1))
  m.run (cc.to_church (2))
  m.run (cc.to_church (3))
  m.run (
    APPLY (
      APPLY (
        VAR ("church_add"),
        cc.to_church (2)),
      cc.to_church (2)))

  t.pass ()
})
