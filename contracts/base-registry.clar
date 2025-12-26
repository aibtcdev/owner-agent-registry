;; title: base-registry
;; version: 1.0.0
;; summary: A secure, modular foundation for mapping human owners to autonomous AI agents.

;; traits
;;

;; token definitions
;;

;; constants
;;

;; data vars
;;

;; data maps
;;

(define-map OwnerToAgent principal principal)
(define-map AgentToOwner principal principal)

(define-map AgentDetails
  principal ;; agent address
  {
    owner: principal, ;; owner address
    name: (string-utf8 256),
    description: (string-utf8 256)
  }
)

;; public functions
;;

;; read only functions
;;




;; private functions
;;

