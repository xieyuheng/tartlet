import test from "ava"
import * as ut from "cicada-lang/lib/util"
import { result_t, ok_t, err_t } from "cicada-lang/lib/result"
import * as cc from "../lib/untyped/core"
import {
  MODULE,
  VAR, LAMBDA, APPLY,
} from "../lib/untyped/syntax"

test ("exp.eval", t => {
  LAMBDA ("x", LAMBDA ("y", VAR ("y")))
    .eval ()

  APPLY (LAMBDA ("x", VAR ("x")), LAMBDA ("x", VAR ("x")))
    .eval ()

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
    .eval ()
  let exp = cc.read_back (new Set (), value)

  t.true (exp.eq (LAMBDA ("y", VAR ("y"))))
})

test ("normalize", t => {
  let exp = cc.normalize (
    new cc.env_t (),
    APPLY (
      LAMBDA ("x", LAMBDA ("y", APPLY (VAR ("x"), VAR ("y")))),
      LAMBDA ("x", VAR ("x"))))

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
