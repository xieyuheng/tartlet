import test from "ava"
import * as ut from "cicada-lang/lib/util"
import { result_t, ok_t, err_t } from "cicada-lang/lib/result"
import * as cc from "../lib/tartlet/core"
import {
  MODULE,
  VAR,
  PI, ARROW, LAMBDA, APPLY,
  SIGMA, PAIR, CONS, CAR, CDR,
  NAT, ZERO, ADD1, IND_NAT,
  EQV, SAME, REPLACE,
  TRIVIAL, SOLE,
  ABSURD, IND_ABSURD,
  ATOM, QUOTE,
  THE, UNIVERSE,
} from "../lib/tartlet/syntax"

test ("exp.eval", t => {
  LAMBDA ("x", LAMBDA ("y", VAR ("y")))
    .eval (new cc.env_t ())

  APPLY (LAMBDA ("x", VAR ("x")), LAMBDA ("y", VAR ("y")))
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

test ("module.define", t => {
  let m = MODULE ()

  m.claim ("three", NAT)
  m.define ("three", ADD1 (ADD1 (ADD1 (ZERO))))

  m.claim ("+", ARROW (NAT, ARROW (NAT, NAT)))
  m.define (
    "+", LAMBDA (
      "n", LAMBDA (
        "k", IND_NAT (
          VAR ("n"), LAMBDA ("_", NAT), VAR ("k"),
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
