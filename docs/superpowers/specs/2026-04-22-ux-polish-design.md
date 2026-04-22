# UX Polish — Responsive System Design Spec

**Date :** 2026-04-22
**Statut :** Approuvé
**Branche :** `feat/ux-polish` (preview Vercel avant merge sur main)

---

## Objectif

Garantir une expérience identique et confortable sur mobile et desktop. Pas d'app native, pas de PWA — juste un site web responsive solide.

**Périmètre après audit du code existant :**
- Loading states : déjà implémentés dans `Results.tsx` (SkeletonCard + spinner) ✅
- `/prix` : déjà `max-w-3xl` ✅
- `/carte` : déjà `max-w-5xl` ✅
- Animations : `animate-fade-up`, `animate-scale-in`, `hover-lift` déjà présents ✅

**Ce qui reste à corriger (scope réel) :**
1. `/comparer` : container trop étroit + dropdowns non responsive + table sans overflow
2. Header mobile : touch targets insuffisants sur les liens de navigation

---

## Architecture

**Tech Stack :** Next.js 14 · TypeScript · Tailwind CSS  
**Stratégie container :** pages de lecture = `max-w-2xl`, pages à contenu large = `max-w-4xl` (comparateur), pages carte/prix déjà correctes  
**Validation :** preview Vercel sur `feat/ux-polish` avant merge sur main

---

## Section 1 — Fichiers

| Fichier | Action | Changements |
|---------|--------|-------------|
| `app/comparer/ComparateurClient.tsx` | Modifier | Container `max-w-4xl`, dropdowns responsive, table overflow |
| `components/Header.tsx` | Modifier | Touch targets mobile nav |

---

## Section 2 — `app/comparer/ComparateurClient.tsx`

### 2.1 Container width

```tsx
// AVANT
<main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">

// APRÈS
<main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-12">
```

### 2.2 Dropdowns — responsive grid

```tsx
// AVANT
<div className="grid grid-cols-3 gap-3 mb-8">

// APRÈS
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
```

Sur mobile (< 640px) les 3 dropdowns s'empilent verticalement. Sur sm+ ils reviennent en ligne.

### 2.3 Table — overflow horizontal sur mobile

```tsx
// AVANT
<div className="bg-surface border border-border rounded-2xl overflow-hidden">
  <table className="w-full text-sm">

// APRÈS
<div className="bg-surface border border-border rounded-2xl overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[400px]">
```

`min-w-[400px]` garantit que la table reste lisible même quand elle scroll horizontalement. `overflow-x-auto` sur le wrapper intérieur (pas le div avec le border-radius) pour ne pas casser le style.

---

## Section 3 — `components/Header.tsx`

### Touch targets — nav mobile

Les liens du menu mobile ont actuellement `py-2.5` (10px padding), soit ~34px de hauteur totale. La recommandation minimale est 44px.

```tsx
// AVANT (ligne ~127)
className="block px-3 py-2.5 rounded-lg text-sm text-muted hover:text-fg hover:bg-surface-2 transition-all font-medium"

// APRÈS
className="block px-3 py-3 rounded-lg text-sm text-muted hover:text-fg hover:bg-surface-2 transition-all font-medium"
```

`py-3` (12px) + 20px de texte = ~44px. Conforme aux guidelines Apple/Google.

---

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Loading states | Pas de changement | Déjà implémentés (SkeletonCard + spinner dans Results.tsx) |
| Animations | Pas de changement | `animate-fade-up`, `animate-scale-in`, `hover-lift` déjà présents |
| `/prix` container | Pas de changement | Déjà `max-w-3xl` |
| `/carte` container | Pas de changement | Déjà `max-w-5xl` |
| `/comparer` container | `max-w-4xl` | Table 3 colonnes mérite plus d'espace sur desktop |
| Dropdowns mobile | `grid-cols-1 sm:grid-cols-3` | 3 selects en ligne trop serrés sur 320-375px |
| Table overflow | `overflow-x-auto` + `min-w-[400px]` | Évite le débordement à 3 destinations sur petit écran |
| Touch targets | `py-3` sur liens nav mobile | Conformité 44px Apple/Google guidelines |
| Tests | Pas de tests unitaires | Changements CSS purs — validation visuelle sur preview Vercel |
| Déploiement | Branche `feat/ux-polish` | L'utilisateur valide le preview avant merge sur main |

---

## Hors scope

- PWA / app native
- Nouvelles animations (déjà en place)
- Refonte du layout desktop (containers `/prix` et `/carte` déjà optimaux)
- Modification des pages de lecture (Home, Destinations, Alertes) — déjà correctes en `max-w-2xl`
