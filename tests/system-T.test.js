import test from "ava"
import * as ut from "cell-complex/lib/util"
import { result_t, ok_t, err_t } from "cell-complex/lib/result"
import * as cc from "../lib/system-T/core"
import {
  MODULE,
  VAR, LAMBDA, APPLY,
  ZERO, ADD1, THE, REC_NAT,
  NAT, ARROW,
} from "../lib/system-T/syntax"

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

test ("exp.infer", t => {
  let ctx = new cc.ctx_t ()
    .ext ("x", NAT)

  t.deepEqual (
    VAR ("x") .infer (ctx),
    new ok_t (NAT))
})

test ("exp.check", t => {
  t.deepEqual (
    ZERO .check (new cc.ctx_t (), NAT),
    new ok_t ("ok"))

  t.deepEqual (
    ADD1 (ZERO) .check (new cc.ctx_t (), NAT),
    new ok_t ("ok"))

  t.deepEqual (
    LAMBDA ("x", VAR ("x")) .check (new cc.ctx_t (), ARROW (NAT, NAT)),
    new ok_t ("ok"))

  t.deepEqual (
    LAMBDA (
      "j", LAMBDA (
        "k", REC_NAT (
          NAT, VAR ("j"), VAR ("k"),
          LAMBDA (
            "prev", LAMBDA (
              "sum", ADD1 (VAR ("sum")))))))
      .check (new cc.ctx_t (), ARROW (NAT, ARROW (NAT, NAT))),
    new ok_t ("ok"))

  t.pass ()
})

test ("module.define", t => {
  let m = MODULE ()

  m.claim (
    "three",
    NAT)
  m.define (
    "three",
    ADD1 (ADD1 (ADD1 (ZERO))))

  m.claim (
    "+",
    ARROW (NAT, ARROW (NAT, NAT)))
  m.define (
    "+",
    LAMBDA (
      "n", LAMBDA (
        "k", REC_NAT (
          NAT, VAR ("n"), VAR ("k"),
          LAMBDA (
            "prev", LAMBDA (
              "almost",
              ADD1 (VAR ("almost"))))))))

  m.run (
    APPLY (VAR ("+"), VAR ("three")))

  m.run (
    APPLY (
      APPLY (VAR ("+"), VAR ("three")),
      VAR ("three")))

  t.pass ()
})
