#!/usr/bin/env python3
"""Build English word data for Mozgoput (association graph) and Lest (word ladder)."""

from __future__ import annotations

import json
import os
import re
from collections import defaultdict, deque
from pathlib import Path

from nltk.corpus import wordnet as wn

ROOT = Path(__file__).resolve().parents[1]
WORD_DIR = Path("/tmp/enwords")
MOZG = ROOT / "games" / "Mozgoput"
LEST = ROOT / "games" / "Lest"

STOP = {
    "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at", "by",
    "for", "with", "from", "as", "is", "are", "was", "were", "be", "been", "being",
    "am", "do", "does", "did", "doing", "have", "has", "had", "having", "it", "its",
    "this", "that", "these", "those", "i", "you", "he", "she", "we", "they", "me",
    "him", "her", "us", "them", "my", "your", "his", "our", "their", "mine", "yours",
    "not", "no", "nor", "so", "than", "too", "very", "just", "also", "only", "own",
    "into", "over", "after", "before", "about", "between", "through", "during",
    "without", "within", "against", "under", "again", "further", "then", "once",
    "here", "there", "when", "where", "why", "how", "all", "any", "both", "each",
    "few", "more", "most", "other", "some", "such", "can", "will", "should", "would",
    "could", "may", "might", "must", "shall", "need", "dare", "ought", "used",
    "what", "which", "who", "whom", "whose", "because", "while", "although",
    "though", "until", "unless", "whether", "either", "neither", "both", "via",
}

# Keep the default EN path family-friendly for GameMonetize.
BLOCK = {
    "anal", "anus", "arse", "ass", "asses", "asshole", "bastard", "bitch", "bloody",
    "blowjob", "bollock", "boner", "boob", "boobs", "bugger", "butt", "clit",
    "clitoris", "cock", "cocks", "coon", "crap", "cum", "cunt", "damn", "dick",
    "dildo", "dyke", "fag", "faggot", "feck", "felch", "fuck", "fucker", "fucking",
    "goddamn", "hell", "homo", "horny", "jerk", "jizz", "kike", "labia", "lmfao",
    "muff", "nigger", "nigga", "omg", "penis", "piss", "poop", "porn", "pube",
    "pussy", "queer", "rape", "rapist", "rectum", "retard", "scrotum", "sex",
    "sexy", "shit", "slut", "smegma", "spunk", "suck", "tits", "tit", "tosser",
    "turd", "twat", "vagina", "wank", "whore", "wtf", "darn", "crap", "pissed",
    "sperm", "semen", "orgasm", "erotic", "nude", "naked", "xxx",
}

# Everyday associations WordNet often misses (gameplay flavor).
EXTRA_CLUSTERS = [
    ["dog", "cat", "pet", "puppy", "kitten", "leash", "bark", "meow", "bone", "collar", "kennel", "litter"],
    ["coffee", "tea", "cup", "mug", "bean", "brew", "cafe", "latte", "espresso", "morning", "breakfast", "sugar", "cream"],
    ["bread", "butter", "toast", "jam", "oven", "bakery", "flour", "yeast", "loaf", "sandwich", "crust"],
    ["sun", "moon", "star", "sky", "cloud", "rain", "storm", "thunder", "lightning", "rainbow", "weather"],
    ["ocean", "sea", "wave", "beach", "sand", "shell", "tide", "shark", "fish", "coral", "island", "boat"],
    ["tree", "forest", "leaf", "branch", "root", "wood", "oak", "pine", "shade", "park"],
    ["car", "road", "wheel", "engine", "driver", "traffic", "highway", "garage", "fuel", "brake", "steering"],
    ["train", "track", "station", "ticket", "platform", "rail", "subway", "metro", "conductor"],
    ["plane", "airport", "pilot", "flight", "wing", "runway", "cabin", "luggage", "jet"],
    ["school", "teacher", "student", "class", "homework", "desk", "pencil", "book", "lesson", "exam", "grade"],
    ["doctor", "nurse", "hospital", "medicine", "patient", "clinic", "health", "pill", "surgery", "ambulance"],
    ["king", "queen", "castle", "crown", "throne", "prince", "princess", "knight", "palace", "royal"],
    ["music", "song", "guitar", "piano", "drum", "violin", "melody", "rhythm", "band", "concert", "singer"],
    ["movie", "film", "cinema", "actor", "camera", "screen", "ticket", "director", "scene"],
    ["computer", "keyboard", "mouse", "screen", "software", "internet", "email", "file", "code", "website"],
    ["phone", "call", "message", "text", "camera", "app", "battery", "signal"],
    ["money", "bank", "coin", "cash", "wallet", "price", "shop", "store", "buy", "sell", "gold"],
    ["house", "home", "door", "window", "roof", "room", "kitchen", "bedroom", "garden", "key"],
    ["food", "dinner", "lunch", "kitchen", "recipe", "plate", "fork", "knife", "spoon", "cook"],
    ["apple", "orange", "banana", "grape", "lemon", "peach", "berry", "fruit", "juice"],
    ["soccer", "football", "basketball", "tennis", "golf", "baseball", "goal", "ball", "team", "coach", "score"],
    ["winter", "summer", "spring", "autumn", "fall", "snow", "ice", "heat", "cold", "season"],
    ["fire", "flame", "smoke", "ash", "burn", "heat", "campfire", "candle"],
    ["water", "river", "lake", "stream", "rain", "drink", "ice", "steam"],
    ["love", "heart", "kiss", "hug", "friend", "family", "wedding", "ring"],
    ["war", "peace", "army", "soldier", "battle", "weapon", "shield", "victory"],
    ["farm", "farmer", "cow", "pig", "chicken", "horse", "barn", "field", "crop", "harvest"],
    ["city", "town", "street", "building", "bridge", "traffic", "crowd", "skyline"],
    ["night", "day", "dark", "light", "shadow", "dawn", "dusk", "midnight"],
    ["baby", "child", "mother", "father", "parent", "family", "cradle", "toy"],
    ["shoe", "boot", "sock", "hat", "coat", "shirt", "dress", "pants", "cloth", "fashion"],
    ["mountain", "hill", "valley", "cliff", "peak", "climb", "rock", "trail"],
    ["space", "planet", "earth", "mars", "rocket", "astronaut", "orbit", "galaxy", "comet"],
    ["law", "court", "judge", "lawyer", "crime", "police", "prison", "trial"],
    ["art", "paint", "brush", "canvas", "color", "museum", "gallery", "drawing"],
    ["time", "clock", "watch", "hour", "minute", "second", "calendar", "year"],
    ["game", "play", "player", "score", "win", "lose", "puzzle", "dice", "card"],
    ["bird", "wing", "feather", "nest", "egg", "fly", "beak", "eagle", "owl"],
    ["flower", "rose", "garden", "petal", "bloom", "seed", "vase", "spring"],
    ["book", "page", "story", "author", "library", "read", "novel", "poem"],
    ["ship", "sail", "harbor", "anchor", "captain", "deck", "voyage", "port"],
    ["snow", "ice", "cold", "frost", "sledge", "ski", "winter", "flake"],
    ["tooth", "dentist", "smile", "brush", "mouth", "gum"],
    ["eye", "see", "vision", "glass", "tear", "blink", "sight"],
    ["hand", "finger", "arm", "palm", "glove", "touch"],
    ["foot", "toe", "leg", "walk", "step", "shoe"],
    ["heart", "blood", "pulse", "chest", "life", "beat"],
    ["bread", "wheat", "grain", "farm", "mill"],
    ["wine", "grape", "bottle", "glass", "vineyard", "drink"],
    ["beer", "bar", "pub", "foam", "mug", "brewery"],
    ["chocolate", "sweet", "candy", "cocoa", "dessert", "cake"],
    ["cake", "party", "birthday", "candle", "frosting", "oven"],
    ["pizza", "cheese", "tomato", "slice", "oven", "crust"],
    ["bee", "honey", "hive", "flower", "sting", "wax"],
    ["spider", "web", "insect", "fly", "silk"],
    ["lion", "tiger", "jungle", "mane", "roar", "cat"],
    ["elephant", "trunk", "ivory", "tusk", "safari"],
    ["horse", "saddle", "ride", "stable", "hoof", "race"],
    ["fish", "hook", "rod", "lake", "swim", "scale"],
    ["snake", "scale", "venom", "slither", "reptile"],
    ["church", "prayer", "priest", "bible", "faith", "altar"],
    ["temple", "monk", "prayer", "shrine", "faith"],
    ["science", "lab", "experiment", "atom", "theory", "research"],
    ["math", "number", "plus", "minus", "equation", "count"],
    ["map", "compass", "north", "travel", "route", "guide"],
    ["camera", "photo", "lens", "flash", "picture", "album"],
    ["letter", "mail", "stamp", "post", "envelope", "address"],
    ["paper", "pen", "ink", "write", "note", "page"],
    ["gold", "silver", "jewel", "ring", "treasure", "coin"],
    ["sword", "shield", "armor", "knight", "blade", "battle"],
    ["ghost", "haunt", "night", "fear", "shadow", "spirit"],
    ["magic", "wizard", "spell", "wand", "potion", "witch"],
    ["dragon", "fire", "scale", "wing", "myth", "knight"],
    ["robot", "machine", "metal", "circuit", "future", "android"],
    ["dream", "sleep", "night", "bed", "pillow", "rest"],
    ["storm", "wind", "rain", "cloud", "thunder", "umbrella"],
    ["desert", "sand", "camel", "oasis", "dune", "hot"],
    ["jungle", "tree", "vine", "rain", "tiger", "parrot"],
    ["island", "palm", "beach", "boat", "ocean", "map"],
    ["volcano", "lava", "ash", "mountain", "erupt", "fire"],
    ["bridge", "river", "span", "road", "arch"],
    ["tower", "tall", "castle", "view", "bell"],
    ["garden", "plant", "soil", "water", "flower", "hoe"],
    ["kitchen", "stove", "pan", "chef", "recipe", "spice"],
    ["office", "desk", "chair", "meeting", "boss", "work"],
    ["factory", "machine", "worker", "steel", "smoke"],
    ["market", "stall", "fruit", "price", "crowd", "shop"],
    ["hotel", "room", "bed", "guest", "key", "lobby"],
    ["restaurant", "menu", "waiter", "table", "meal", "chef"],
    ["prison", "guard", "cell", "lock", "crime", "bar"],
    ["museum", "art", "history", "exhibit", "guide"],
    ["library", "book", "shelf", "quiet", "read", "card"],
    ["stadium", "crowd", "sport", "cheer", "field", "game"],
    ["theater", "stage", "actor", "play", "curtain", "audience"],
    ["circus", "clown", "tent", "lion", "acrobat", "ring"],
    ["zoo", "animal", "cage", "tiger", "keeper", "visit"],
    ["park", "bench", "tree", "path", "play", "grass"],
    ["river", "boat", "fish", "bridge", "current", "bank"],
    ["lake", "boat", "fish", "swim", "shore", "calm"],
    ["forest", "tree", "path", "deer", "cabin", "moss"],
    ["cave", "dark", "bat", "rock", "echo", "bear"],
    ["road", "car", "sign", "map", "trip", "dust"],
    ["key", "lock", "door", "safe", "secret"],
    ["clock", "time", "tick", "alarm", "hour"],
    ["mirror", "glass", "face", "reflection", "wall"],
    ["window", "glass", "view", "light", "curtain"],
    ["door", "key", "handle", "room", "enter"],
    ["light", "lamp", "sun", "dark", "bulb", "glow"],
    ["shadow", "dark", "light", "night", "shape"],
    ["color", "red", "blue", "green", "paint", "rainbow"],
    ["red", "blood", "rose", "fire", "apple", "stop"],
    ["blue", "sky", "sea", "cold", "sad"],
    ["green", "grass", "leaf", "forest", "go"],
    ["yellow", "sun", "lemon", "gold", "banana"],
    ["black", "night", "dark", "coal", "ink"],
    ["white", "snow", "cloud", "milk", "paper"],
    ["hot", "fire", "sun", "summer", "spice"],
    ["cold", "ice", "snow", "winter", "wind"],
    ["sweet", "sugar", "candy", "honey", "cake"],
    ["salt", "sea", "kitchen", "taste", "tear"],
    ["happy", "smile", "laugh", "joy", "party"],
    ["sad", "tear", "cry", "blue", "grief"],
    ["angry", "fire", "shout", "red", "storm"],
    ["fear", "dark", "ghost", "night", "run"],
    ["hope", "light", "future", "dream", "star"],
    ["truth", "lie", "fact", "honest", "word"],
    ["power", "king", "energy", "strong", "control"],
    ["energy", "power", "sun", "electric", "fuel"],
    ["electric", "wire", "light", "power", "storm"],
    ["metal", "iron", "steel", "gold", "hard"],
    ["glass", "window", "bottle", "mirror", "break"],
    ["wood", "tree", "table", "forest", "fire"],
    ["stone", "rock", "wall", "mountain", "hard"],
    ["paper", "book", "tree", "write", "fold"],
    ["cloth", "cotton", "shirt", "thread", "weave"],
    ["plastic", "bottle", "cheap", "recycle"],
    ["air", "wind", "breath", "sky", "fly"],
    ["earth", "soil", "planet", "ground", "world"],
    ["world", "earth", "map", "people", "globe"],
    ["life", "death", "birth", "heart", "live"],
    ["death", "grave", "life", "end", "ghost"],
    ["work", "job", "office", "pay", "labor"],
    ["play", "game", "fun", "child", "sport"],
    ["sleep", "bed", "night", "dream", "rest"],
    ["eat", "food", "mouth", "hungry", "meal"],
    ["drink", "water", "cup", "thirst", "glass"],
    ["walk", "foot", "path", "step", "road"],
    ["run", "fast", "race", "leg", "sport"],
    ["fly", "bird", "plane", "sky", "wing"],
    ["swim", "water", "fish", "pool", "sea"],
    ["write", "pen", "paper", "book", "word"],
    ["read", "book", "page", "story", "eye"],
    ["speak", "word", "mouth", "voice", "talk"],
    ["listen", "ear", "sound", "music", "quiet"],
    ["see", "eye", "light", "look", "vision"],
    ["think", "brain", "mind", "idea", "thought"],
    ["brain", "mind", "think", "head", "idea"],
    ["word", "letter", "book", "speak", "language"],
    ["language", "word", "speak", "tongue", "english"],
    ["number", "count", "math", "digit", "one"],
    ["circle", "round", "ring", "wheel", "shape"],
    ["square", "box", "shape", "four", "block"],
    ["line", "draw", "path", "edge", "straight"],
    ["point", "dot", "tip", "sharp", "end"],
    ["sound", "ear", "noise", "music", "voice"],
    ["silence", "quiet", "night", "still", "hush"],
    ["speed", "fast", "car", "race", "time"],
    ["weight", "heavy", "scale", "mass", "lift"],
    ["size", "big", "small", "measure", "large"],
    ["north", "south", "east", "west", "compass", "map"],
    ["up", "down", "high", "low", "sky", "ground"],
]


def load_lines(path: Path) -> list[str]:
    return [ln.strip().lower() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]


def clean_token(w: str) -> str | None:
    w = w.strip().lower().replace("_", " ")
    if " " in w or "-" in w:
        return None
    if not re.fullmatch(r"[a-z]+", w):
        return None
    if len(w) < 3 or len(w) > 16:
        return None
    if w in STOP or w in BLOCK:
        return None
    if any(bad in w for bad in ("fuck", "shit", "cock", "cunt", "nigg", "porn")):
        return None
    return w


def in_wordnet(word: str) -> bool:
    return bool(wn.synsets(word))


def build_vocab() -> list[str]:
    g10 = load_lines(WORD_DIR / "google-10k.txt")
    g20 = load_lines(WORD_DIR / "google-20k.txt")
    enable = set(load_lines(WORD_DIR / "enable1.txt"))

    ranked: list[str] = []
    seen = set()
    for src in (g10, g20):
        for w in src:
            c = clean_token(w)
            if not c or c in seen:
                continue
            if c not in enable and not in_wordnet(c):
                continue
            seen.add(c)
            ranked.append(c)

    # Prefer words that exist in WordNet so the graph has real relations.
    wn_first = [w for w in ranked if in_wordnet(w)]
    extra = [w for w in ranked if w not in set(wn_first)]
    vocab = wn_first[:12000] + extra[:1500]

    for cluster in EXTRA_CLUSTERS:
        for w in cluster:
            c = clean_token(w)
            if c and c not in seen:
                seen.add(c)
                vocab.append(c)
    # stable unique
    out, seen2 = [], set()
    for w in vocab:
        if w not in seen2:
            seen2.add(w)
            out.append(w)
    return out


def wordnet_neighbors(word: str, vocab: set[str]) -> dict[str, float]:
    rels: dict[str, float] = {}

    def add(name: str, weight: float) -> None:
        c = clean_token(name)
        if not c or c == word or c not in vocab:
            return
        rels[c] = max(rels.get(c, 0.0), weight)

    synsets = wn.synsets(word)
    # Prefer synsets that actually list this lemma.
    preferred = [s for s in synsets if word in {l.name().replace("_", " ").lower() for l in s.lemmas()}]
    use = preferred or synsets[:6]
    for ss in use[:8]:
        for lem in ss.lemmas():
            add(lem.name(), 0.95)
        for hyp in ss.hypernyms()[:6]:
            for lem in hyp.lemmas()[:5]:
                add(lem.name(), 0.78)
        for hypo in ss.hyponyms()[:10]:
            for lem in hypo.lemmas()[:4]:
                add(lem.name(), 0.72)
        for mer in ss.part_meronyms() + ss.substance_meronyms() + ss.member_meronyms():
            for lem in mer.lemmas()[:4]:
                add(lem.name(), 0.68)
        for hol in ss.part_holonyms() + ss.substance_holonyms() + ss.member_holonyms():
            for lem in hol.lemmas()[:4]:
                add(lem.name(), 0.68)
        for sim in ss.similar_tos():
            for lem in sim.lemmas()[:5]:
                add(lem.name(), 0.82)
        for also in ss.also_sees():
            for lem in also.lemmas()[:4]:
                add(lem.name(), 0.58)
        for inst in ss.instance_hyponyms()[:6]:
            for lem in inst.lemmas()[:3]:
                add(lem.name(), 0.6)
    return rels


def add_clusters(graph: dict[str, dict[str, float]], vocab: set[str]) -> None:
    for cluster in EXTRA_CLUSTERS:
        words = [clean_token(w) for w in cluster]
        words = [w for w in words if w and w in vocab]
        for i, a in enumerate(words):
            for b in words:
                if a == b:
                    continue
                graph[a][b] = max(graph[a].get(b, 0.0), 0.88)


def add_shared_hypernym_bridges(graph: dict[str, dict[str, float]], vocab: list[str], vocab_set: set[str]) -> None:
    """Connect words that share a close hypernym so categories form playable cliques."""
    buckets: dict[str, list[str]] = defaultdict(list)
    for w in vocab:
        syns = [s for s in wn.synsets(w) if s.pos() in ("n", "a", "v")][:4]
        for ss in syns:
            for hyp in ss.hypernyms()[:2]:
                key = hyp.name()
                if len(buckets[key]) < 40:
                    buckets[key].append(w)
    for members in buckets.values():
        uniq = []
        seen = set()
        for w in members:
            if w not in seen:
                seen.add(w)
                uniq.append(w)
        if len(uniq) < 3:
            continue
        # Connect each word to a few others in the same bucket (not a full clique).
        for i, a in enumerate(uniq):
            for b in uniq[i + 1 : i + 5]:
                if a == b:
                    continue
                graph[a][b] = max(graph[a].get(b, 0.0), 0.42)
                graph[b][a] = max(graph[b].get(a, 0.0), 0.42)


def make_undirected(graph: dict[str, dict[str, float]]) -> None:
    add: list[tuple[str, str, float]] = []
    for a, nb in graph.items():
        for b, w in nb.items():
            if a not in graph[b]:
                add.append((b, a, w))
    for b, a, w in add:
        graph[b][a] = max(graph[b].get(a, 0.0), w)


def largest_component(graph: dict[str, dict[str, float]]) -> set[str]:
    seen: set[str] = set()
    best: set[str] = set()
    nodes = list(graph)
    for start in nodes:
        if start in seen:
            continue
        q = deque([start])
        comp = set()
        seen.add(start)
        while q:
            cur = q.popleft()
            comp.add(cur)
            for nx in graph[cur]:
                if nx not in seen and nx in graph:
                    seen.add(nx)
                    q.append(nx)
        if len(comp) > len(best):
            best = comp
    return best


def write_js_array(path: Path, name: str, words: list[str]) -> None:
    body = ",\n".join(f'  {json.dumps(w)}' for w in words)
    path.write_text(f"const {name} = [\n{body}\n];\n", encoding="utf-8")


def write_js_graph(path: Path, graph: dict[str, dict[str, float]]) -> None:
    parts = ["const GRAPH_DATA = {"]
    items = list(graph.items())
    for i, (word, nb) in enumerate(items):
        inner = ",\n".join(
            f"    {json.dumps(k)}: {round(v, 4)}"
            for k, v in sorted(nb.items(), key=lambda kv: (-kv[1], kv[0]))
        )
        comma = "," if i < len(items) - 1 else ""
        parts.append(f"  {json.dumps(word)}: {{\n{inner}\n  }}{comma}")
    parts.append("};\n")
    path.write_text("\n".join(parts), encoding="utf-8")


def write_word_list_template(path: Path, words: list[str]) -> None:
    body = "\n".join(words)
    path.write_text(f"const WORD_LIST = `\n{body}\n`;\n", encoding="utf-8")


def ladder_neighbors(word: str, dictionary: set[str], alphabet: str) -> list[str]:
    out = []
    chars = list(word)
    for i, ch in enumerate(chars):
        for letter in alphabet:
            if letter == ch:
                continue
            chars[i] = letter
            nxt = "".join(chars)
            if nxt in dictionary:
                out.append(nxt)
        chars[i] = ch
    return out


def largest_ladder_component(words: list[str]) -> list[str]:
    if not words:
        return []
    d = set(words)
    n = len(words[0])
    alphabet = "abcdefghijklmnopqrstuvwxyz"
    adj = {w: ladder_neighbors(w, d, alphabet) for w in words}
    seen: set[str] = set()
    best: list[str] = []
    for start in words:
        if start in seen:
            continue
        q = deque([start])
        seen.add(start)
        comp = []
        while q:
            cur = q.popleft()
            comp.append(cur)
            for nx in adj[cur]:
                if nx not in seen:
                    seen.add(nx)
                    q.append(nx)
        if len(comp) > len(best):
            best = comp
    return sorted(best)


def build_mozgoput() -> None:
    print("Building Mozgoput English graph...")
    vocab = build_vocab()
    vocab_set = set(vocab)
    graph: dict[str, dict[str, float]] = {w: {} for w in vocab}
    for i, w in enumerate(vocab):
        if i % 1500 == 0:
            print(f"  wordnet {i}/{len(vocab)}")
        for nb, wt in wordnet_neighbors(w, vocab_set).items():
            graph[w][nb] = max(graph[w].get(nb, 0.0), wt)
    add_clusters(graph, vocab_set)
    add_shared_hypernym_bridges(graph, vocab, vocab_set)
    make_undirected(graph)

    # Drop empty nodes, then keep the giant component.
    graph = {w: nb for w, nb in graph.items() if nb}
    giant = largest_component(graph)
    graph = {w: {k: v for k, v in nb.items() if k in giant} for w, nb in graph.items() if w in giant}
    graph = {w: nb for w, nb in graph.items() if nb}

    words = sorted(graph)
    degrees = [len(graph[w]) for w in words]
    print(f"  nodes={len(words)} edges={sum(degrees)//2} avg_deg={sum(degrees)/len(degrees):.1f} "
          f"min={min(degrees)} max={max(degrees)}")

    write_js_array(MOZG / "words.js", "WORDS_DATA", words)
    write_js_graph(MOZG / "graph.js", graph)
    print(f"  wrote {MOZG / 'words.js'} and {MOZG / 'graph.js'}")


def build_lest() -> None:
    print("Building Lest English noun list...")
    g20 = set(load_lines(WORD_DIR / "google-20k.txt"))
    g10 = set(load_lines(WORD_DIR / "google-10k.txt"))
    enable = set(load_lines(WORD_DIR / "enable1.txt"))

    nouns: list[str] = []
    seen = set()
    # Rank: 10k nouns first, then 20k, then remaining WordNet nouns in enable1.
    candidates = []
    for w in load_lines(WORD_DIR / "google-10k.txt") + load_lines(WORD_DIR / "google-20k.txt"):
        c = clean_token(w)
        if c:
            candidates.append(c)
    # Extra common ladder-friendly words from enable1 that are WordNet nouns.
    for w in sorted(enable):
        c = clean_token(w)
        if c and 3 <= len(c) <= 7:
            candidates.append(c)

    for w in candidates:
        if w in seen or not (3 <= len(w) <= 7):
            continue
        if w not in enable:
            continue
        syns = wn.synsets(w, pos=wn.NOUN)
        # Allow high-frequency adjectives/verbs too — word ladders need them.
        if not syns and w not in g10:
            continue
        if not syns and w not in g20:
            continue
        seen.add(w)
        nouns.append(w)

    by_len: dict[int, list[str]] = defaultdict(list)
    for w in nouns:
        by_len[len(w)].append(w)

    kept: list[str] = []
    for n in range(3, 8):
        # Prefer common words, but keep enough for a connected ladder graph.
        pool = by_len[n]
        common = [w for w in pool if w in g20]
        extra = [w for w in pool if w not in g20]
        # Start with common, add extra until the giant component is large enough.
        chosen = list(common)
        targets = {3: 400, 4: 1200, 5: 1500, 6: 1200, 7: 800}
        if len(chosen) < targets[n]:
            chosen.extend(extra[: targets[n] - len(chosen) + 800])
        comp = largest_ladder_component(chosen)
        # If the common-only component is thin, fold in more enable1 nouns.
        if len(comp) < targets[n] * 0.6:
            chosen = list(dict.fromkeys(common + extra[:4000]))
            comp = largest_ladder_component(chosen)
        print(f"  len {n}: pool={len(pool)} kept_component={len(comp)}")
        kept.extend(comp)

    kept = sorted(set(kept))
    write_word_list_template(LEST / "english-nouns.js", kept)
    print(f"  wrote {len(kept)} words to {LEST / 'english-nouns.js'}")


def main() -> None:
    MOZG.mkdir(parents=True, exist_ok=True)
    LEST.mkdir(parents=True, exist_ok=True)
    build_mozgoput()
    build_lest()
    print("done")


if __name__ == "__main__":
    main()
