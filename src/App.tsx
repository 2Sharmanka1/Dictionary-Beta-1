import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Book, 
  Folder, 
  Tag as TagIcon, 
  Volume2, 
  Edit2, 
  Trash2, 
  Copy,
  ChevronRight, 
  ChevronDown, 
  MoreVertical,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dictionary, Topic, Term, Tag, AppState, Translation, Link } from './types';
import { enrichTerm } from './lib/gemini';

const STORAGE_KEY = 'linguist_app_state';

const INITIAL_STATE: AppState = {
  dictionaries: [],
  topics: [],
  terms: [],
  tags: []
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [activeDictionaryId, setActiveDictionaryId] = useState<string | null>(() => {
    return state.dictionaries.length > 0 ? state.dictionaries[0].id : null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'term' | 'date'>('term');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeDictionary = state.dictionaries.find(d => d.id === activeDictionaryId);

  const filteredTerms = useMemo(() => {
    let terms = state.terms.filter(t => t.dictionaryId === activeDictionaryId);
    
    if (selectedTopicId !== 'all') {
      terms = terms.filter(t => t.topicId === selectedTopicId);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      terms = terms.filter(t => 
        t.term.toLowerCase().includes(q) || 
        t.translations.some(tr => tr.text.toLowerCase().includes(q)) ||
        t.tags.some(tagId => state.tags.find(tag => tag.id === tagId)?.name.toLowerCase().includes(q))
      );
    }

    return terms.sort((a, b) => {
      if (sortBy === 'term') {
        return sortOrder === 'asc' ? a.term.localeCompare(b.term) : b.term.localeCompare(a.term);
      } else {
        return sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
      }
    });
  }, [state.terms, activeDictionaryId, selectedTopicId, searchQuery, sortBy, sortOrder, state.tags]);

  const addDictionary = (name: string, source: string, target: string) => {
    const newDict: Dictionary = {
      id: crypto.randomUUID(),
      name,
      sourceLanguage: source,
      targetLanguage: target,
      createdAt: Date.now()
    };
    setState(prev => ({ ...prev, dictionaries: [...prev.dictionaries, newDict] }));
    setActiveDictionaryId(newDict.id);
    toast.success('Dictionary created');
  };

  const addTopic = (name: string, parentId: string | null = null) => {
    if (!activeDictionaryId) return;
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      name,
      parentId,
      dictionaryId: activeDictionaryId
    };
    setState(prev => ({ ...prev, topics: [...prev.topics, newTopic] }));
    toast.success('Topic added');
  };

  const addTerm = (termData: Partial<Term>) => {
    if (!activeDictionaryId) return;
    const newTerm: Term = {
      id: crypto.randomUUID(),
      term: termData.term || '',
      translations: termData.translations || [],
      pronunciation: termData.pronunciation || '',
      illustration: termData.illustration || '',
      tags: termData.tags || [],
      groups: termData.groups || [],
      topicId: termData.topicId || 'default',
      dictionaryId: activeDictionaryId,
      links: termData.links || [],
      definitions: termData.definitions || [],
      examples: termData.examples || [],
      synonyms: termData.synonyms || [],
      conjugations: termData.conjugations || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...termData
    };
    setState(prev => ({ ...prev, terms: [newTerm, ...prev.terms] }));
    toast.success('Term added');
  };

  const updateTerm = (id: string, updates: Partial<Term>) => {
    setState(prev => ({
      ...prev,
      terms: prev.terms.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)
    }));
    toast.success('Term updated');
  };

  const deleteTerm = (id: string) => {
    setState(prev => ({ ...prev, terms: prev.terms.filter(t => t.id !== id) }));
    toast.success('Term deleted');
  };

  const duplicateTerm = (term: Term) => {
    const newTerm: Term = {
      ...term,
      id: crypto.randomUUID(),
      term: `${term.term} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setState(prev => ({ ...prev, terms: [newTerm, ...prev.terms] }));
    toast.success('Term duplicated');
  };

  const addTag = (tag: Tag) => {
    setState(prev => ({ ...prev, tags: [...prev.tags, tag] }));
  };

  const speak = (text: string, lang: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#111827] font-sans flex overflow-hidden h-screen">
      <Toaster position="top-center" />
      
      {/* Sidebar Navigation */}
      <aside className="w-[260px] bg-white border-r flex flex-col p-6 shrink-0">
        <div className="text-[20px] font-extrabold text-primary mb-8 tracking-tighter">LEXICON.</div>
        
        <div className="space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">Dictionaries</div>
            <DictionarySelector 
              dictionaries={state.dictionaries} 
              activeId={activeDictionaryId} 
              onSelect={setActiveDictionaryId}
              onAdd={addDictionary}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Categories</div>
              <AddTopicDialog onAdd={addTopic} parentTopics={state.topics.filter(t => t.dictionaryId === activeDictionaryId)} />
            </div>
            
            <div className="space-y-1">
              <Button 
                variant={selectedTopicId === 'all' ? 'secondary' : 'ghost'} 
                className={cn(
                  "w-full justify-start text-sm h-9 px-3 rounded-lg transition-colors",
                  selectedTopicId === 'all' ? "bg-secondary text-primary font-semibold" : "hover:bg-gray-50"
                )}
                onClick={() => setSelectedTopicId('all')}
              >
                All Terms
              </Button>
              <TopicTree 
                topics={state.topics.filter(t => t.dictionaryId === activeDictionaryId)}
                selectedId={selectedTopicId}
                onSelect={setSelectedTopicId}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search vocabulary..." 
              className="pl-10 h-10 bg-[#f9fafb] border-gray-200 rounded-lg focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="outline" size="sm" className="h-10 rounded-lg gap-2 border-gray-200" />
              }>
                <ArrowUpDown className="w-4 h-4" />
                Sort: {sortBy === 'term' ? 'A-Z' : 'Date'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('term')}>By Term</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date')}>By Date</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOrder('asc')}>Ascending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('desc')}>Descending</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TermDialog 
              onAdd={addTerm} 
              onAddTag={addTag}
              topics={state.topics.filter(t => t.dictionaryId === activeDictionaryId)}
              tags={state.tags}
              activeDictionary={activeDictionary || { sourceLanguage: 'en', targetLanguage: 'es' } as Dictionary}
              defaultTopicId={selectedTopicId !== 'all' ? selectedTopicId : 'default'}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {!activeDictionary ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white border rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <Book className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Lexicon</h2>
              <p className="text-muted-foreground mb-8 max-w-md">Create your first dictionary to start building your personal vocabulary library.</p>
              <AddDictionaryDialog onAdd={addDictionary} />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">
                    {activeDictionary.name}
                  </h2>
                  <p className="text-muted-foreground mt-1 font-medium">
                    {filteredTerms.length} terms in this collection
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredTerms.map((term) => (
                    <TermCard 
                      key={term.id} 
                      term={term} 
                      onSpeak={() => speak(term.term, activeDictionary.sourceLanguage)}
                      onDelete={() => deleteTerm(term.id)}
                      onCopy={() => duplicateTerm(term)}
                      onUpdate={updateTerm}
                      onAddTag={addTag}
                      tags={state.tags}
                      topics={state.topics}
                      activeDictionary={activeDictionary}
                    />
                  ))}
                </AnimatePresence>
                {filteredTerms.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                    <p className="text-muted-foreground">No terms found matching your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- Sub-components ---

function DictionarySelector({ dictionaries, activeId, onSelect, onAdd }: { 
  dictionaries: Dictionary[], 
  activeId: string | null, 
  onSelect: (id: string) => void,
  onAdd: (name: string, source: string, target: string) => void
}) {
  const active = dictionaries.find(d => d.id === activeId);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" className="w-full justify-start h-10 px-3 rounded-lg hover:bg-gray-50 transition-colors" />
      }>
        <Book className="w-4 h-4 mr-2 text-primary" />
        <span className="font-medium truncate">{active?.name || 'Select Dictionary'}</span>
        <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {dictionaries.map(d => (
          <DropdownMenuItem key={d.id} onClick={() => onSelect(d.id)} className="flex items-center justify-between">
            <span>{d.name}</span>
            <span className="text-[10px] uppercase opacity-50">{d.sourceLanguage} → {d.targetLanguage}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <AddDictionaryDialog onAdd={onAdd} trigger={
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-primary focus:text-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Dictionary
          </DropdownMenuItem>
        } />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddDictionaryDialog({ onAdd, trigger }: { onAdd: (n: string, s: string, t: string) => void, trigger?: React.ReactNode }) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('en');
  const [target, setTarget] = useState('es');
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!name) return;
    onAdd(name, source, target);
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger || <Button className="h-11 rounded-lg bg-primary text-white font-bold px-8 hover:bg-primary/90 shadow-md" />
      }>
        {trigger ? null : "Create New Dictionary"}
      </DialogTrigger>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">Create Dictionary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input placeholder="e.g. Spanish Learning" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-lg border-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Source Language (ISO)</Label>
              <Input placeholder="en" value={source} onChange={(e) => setSource(e.target.value)} className="h-11 rounded-lg border-gray-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Target Language (ISO)</Label>
              <Input placeholder="es" value={target} onChange={(e) => setTarget(e.target.value)} className="h-11 rounded-lg border-gray-200" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="w-full h-11 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTopicDialog({ onAdd, parentTopics }: { onAdd: (n: string, p: string | null) => void, parentTopics: Topic[] }) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | 'none'>('none');
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!name) return;
    onAdd(name, parentId === 'none' ? null : parentId);
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-50 text-gray-400" />
      }>
        <Plus className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">Add New Topic</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Topic Name</Label>
            <Input placeholder="e.g. Travel, Food, Grammar" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-lg border-gray-200" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Parent Topic (Optional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200">
                <SelectValue placeholder="Select parent topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Root)</SelectItem>
                {parentTopics.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="w-full h-11 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">Add Topic</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopicTree({ topics, selectedId, onSelect, parentId = null, level = 0 }: { 
  topics: Topic[], 
  selectedId: string | 'all', 
  onSelect: (id: string) => void,
  parentId?: string | null,
  level?: number
}) {
  const children = topics.filter(t => t.parentId === parentId);
  
  if (children.length === 0) return null;

  return (
    <div className={cn("space-y-1", level > 0 && "ml-4 border-l border-gray-100 pl-2")}>
      {children.map(topic => (
        <div key={topic.id} className="space-y-1">
          <Button 
            variant={selectedId === topic.id ? 'secondary' : 'ghost'} 
            className={cn(
              "w-full justify-start h-9 text-sm px-3 rounded-lg transition-colors",
              selectedId === topic.id ? "bg-secondary text-primary font-semibold" : "font-normal hover:bg-gray-50"
            )}
            onClick={() => onSelect(topic.id)}
          >
            {topic.name}
          </Button>
          <TopicTree topics={topics} selectedId={selectedId} onSelect={onSelect} parentId={topic.id} level={level + 1} />
        </div>
      ))}
    </div>
  );
}

function TermDialog({ onAdd, onUpdate, onAddTag, topics, tags, activeDictionary, defaultTopicId, editingTerm, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: { 
  onAdd?: (t: Partial<Term>) => void, 
  onUpdate?: (id: string, t: Partial<Term>) => void,
  onAddTag?: (tag: Tag) => void,
  topics: Topic[], 
  tags: Tag[],
  activeDictionary: Dictionary,
  defaultTopicId?: string,
  editingTerm?: Term,
  trigger?: React.ReactNode,
  open?: boolean,
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const [term, setTerm] = useState(editingTerm?.term || '');
  const [translationInput, setTranslationInput] = useState('');
  const [translations, setTranslations] = useState<Translation[]>(editingTerm?.translations || []);
  const [topicId, setTopicId] = useState<string>(editingTerm?.topicId || defaultTopicId || 'default');
  const [isEnriching, setIsEnriching] = useState(false);

  const [illustration, setIllustration] = useState(editingTerm?.illustration || '');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(editingTerm?.tags || []);
  const [links, setLinks] = useState<Link[]>(editingTerm?.links || []);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<Link['type']>( 'definition');
  const [groupInput, setGroupInput] = useState('');
  const [groups, setGroups] = useState<string[]>(editingTerm?.groups || []);

  const [definitionInput, setDefinitionInput] = useState('');
  const [definitions, setDefinitions] = useState<string[]>(editingTerm?.definitions || []);
  const [exampleInput, setExampleInput] = useState('');
  const [examples, setExamples] = useState<string[]>(editingTerm?.examples || []);
  const [synonymInput, setSynonymInput] = useState('');
  const [synonyms, setSynonyms] = useState<string[]>(editingTerm?.synonyms || []);
  const [conjugationInput, setConjugationInput] = useState('');
  const [conjugations, setConjugations] = useState<string[]>(editingTerm?.conjugations || []);

  useEffect(() => {
    if (open) {
      if (editingTerm) {
        setTerm(editingTerm.term);
        setTranslations(editingTerm.translations);
        setTopicId(editingTerm.topicId);
        setIllustration(editingTerm.illustration || '');
        setSelectedTags(editingTerm.tags);
        setLinks(editingTerm.links);
        setGroups(editingTerm.groups);
        setDefinitions(editingTerm.definitions || []);
        setExamples(editingTerm.examples || []);
        setSynonyms(editingTerm.synonyms || []);
        setConjugations(editingTerm.conjugations || []);
      } else if (defaultTopicId) {
        setTopicId(defaultTopicId);
      }
    }
  }, [open, editingTerm, defaultTopicId]);

  const handleAddTranslation = () => {
    if (!translationInput.trim()) return;
    setTranslations([...translations, { id: crypto.randomUUID(), text: translationInput.trim() }]);
    setTranslationInput('');
  };

  const handleAddDefinition = () => {
    if (!definitionInput.trim()) return;
    setDefinitions([...definitions, definitionInput.trim()]);
    setDefinitionInput('');
  };

  const handleAddExample = () => {
    if (!exampleInput.trim()) return;
    setExamples([...examples, exampleInput.trim()]);
    setExampleInput('');
  };

  const handleAddSynonym = () => {
    if (!synonymInput.trim()) return;
    setSynonyms([...synonyms, synonymInput.trim()]);
    setSynonymInput('');
  };

  const handleAddConjugation = () => {
    if (!conjugationInput.trim()) return;
    setConjugations([...conjugations, conjugationInput.trim()]);
    setConjugationInput('');
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const existingTag = tags.find(t => t.name.toLowerCase() === tagInput.trim().toLowerCase());
    if (existingTag) {
      if (!selectedTags.includes(existingTag.id)) {
        setSelectedTags([...selectedTags, existingTag.id]);
      }
    } else {
      const newTag: Tag = { id: crypto.randomUUID(), name: tagInput.trim(), color: 'blue' };
      if (onAddTag) onAddTag(newTag);
      setSelectedTags([...selectedTags, newTag.id]);
    }
    setTagInput('');
  };

  const handleAddLink = () => {
    if (!linkTitle || !linkUrl) return;
    setLinks([...links, { id: crypto.randomUUID(), title: linkTitle, url: linkUrl, type: linkType }]);
    setLinkTitle('');
    setLinkUrl('');
  };

  const handleAddGroup = () => {
    if (!groupInput.trim()) return;
    setGroups([...groups, groupInput.trim()]);
    setGroupInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ';') {
      e.preventDefault();
      handleAddTranslation();
    }
  };

  const handleEnrich = async () => {
    if (!term) return;
    setIsEnriching(true);
    const data = await enrichTerm(term, activeDictionary.sourceLanguage, activeDictionary.targetLanguage);
    if (data) {
      if (data.translations) {
        setTranslations(data.translations.map((t: string) => ({ id: crypto.randomUUID(), text: t })));
      }
      if (data.definition) {
        setLinks(prev => [...prev, { id: crypto.randomUUID(), title: 'AI Definition', url: '#', type: 'definition' }]);
      }
      toast.success('AI Enrichment complete!');
    }
    setIsEnriching(false);
  };

  const handleSubmit = () => {
    if (!term || translations.length === 0) {
      toast.error('Please provide a term and at least one translation');
      return;
    }
    
    const termData = { 
      term, 
      translations, 
      topicId, 
      illustration, 
      tags: selectedTags, 
      links,
      groups,
      definitions,
      examples,
      synonyms,
      conjugations
    };

    if (editingTerm && onUpdate) {
      onUpdate(editingTerm.id, termData);
    } else if (onAdd) {
      onAdd(termData);
      setTerm('');
      setTranslations([]);
      setIllustration('');
      setSelectedTags([]);
      setLinks([]);
      setGroups([]);
      setDefinitions([]);
      setExamples([]);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger || (
          <Button className="h-10 rounded-lg bg-primary text-white font-semibold px-6 hover:bg-primary/90 transition-all shadow-sm">
            + Add New Entry
          </Button>
        )
      }>
        {trigger ? null : "+ Add New Entry"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {editingTerm ? 'Edit Vocabulary Term' : 'Add Vocabulary Term'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Term ({activeDictionary.sourceLanguage})</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Word or sentence..." 
                value={term} 
                onChange={(e) => setTerm(e.target.value)} 
                className="text-lg font-medium h-12 rounded-lg border-gray-200"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleEnrich} 
                disabled={isEnriching || !term}
                className="shrink-0 h-12 w-12 rounded-lg border-gray-200"
              >
                <Sparkles className={cn("w-5 h-5", isEnriching && "animate-pulse text-primary")} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Translations ({activeDictionary.targetLanguage})</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Add translation (Enter or ;)" 
                value={translationInput} 
                onChange={(e) => setTranslationInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-11 rounded-lg border-gray-200"
              />
              <Button variant="secondary" size="icon" onClick={handleAddTranslation} className="h-11 w-11 rounded-lg">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {translations.map(t => (
                <Badge key={t.id} className="bg-gray-100 text-gray-900 hover:bg-gray-200 border-none px-3 py-1 rounded-md text-sm font-medium">
                  {t.text}
                  <button onClick={() => setTranslations(translations.filter(tr => tr.id !== t.id))} className="ml-2 hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Definitions</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Add definition..." 
                value={definitionInput} 
                onChange={(e) => setDefinitionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDefinition())}
                className="h-11 rounded-lg border-gray-200"
              />
              <Button variant="secondary" size="icon" onClick={handleAddDefinition} className="h-11 w-11 rounded-lg">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {definitions.map((d, i) => (
                <div key={i} className="bg-blue-50 text-blue-900 border border-blue-100 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
                  <span className="flex-1">{d}</span>
                  <button onClick={() => setDefinitions(definitions.filter((_, idx) => idx !== i))} className="ml-2 text-blue-400 hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Examples</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Add example sentence..." 
                value={exampleInput} 
                onChange={(e) => setExampleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExample())}
                className="h-11 rounded-lg border-gray-200"
              />
              <Button variant="secondary" size="icon" onClick={handleAddExample} className="h-11 w-11 rounded-lg">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {examples.map((ex, i) => (
                <div key={i} className="bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-sm italic flex items-center justify-between">
                  <span className="flex-1">"{ex}"</span>
                  <button onClick={() => setExamples(examples.filter((_, idx) => idx !== i))} className="ml-2 text-gray-400 hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="text-sm font-bold uppercase tracking-wider text-muted-foreground hover:no-underline">Advanced Details</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Topic</Label>
                  <Select value={topicId} onValueChange={setTopicId}>
                    <SelectTrigger className="h-11 rounded-lg border-gray-200">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Uncategorized</SelectItem>
                      {topics.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Illustration URL</Label>
                  <Input 
                    placeholder="https://..." 
                    value={illustration} 
                    onChange={(e) => setIllustration(e.target.value)} 
                    className="h-11 rounded-lg border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tags</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add tag..." 
                      value={tagInput} 
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="h-11 rounded-lg border-gray-200"
                    />
                    <Button variant="secondary" size="icon" onClick={handleAddTag} className="h-11 w-11 rounded-lg">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return (
                        <Badge key={tagId} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-none px-3 py-1 rounded-md text-sm font-medium">
                          #{tag?.name || 'Unknown'}
                          <button onClick={() => setSelectedTags(selectedTags.filter(id => id !== tagId))} className="ml-2 hover:text-destructive transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Groups (Complementary)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add group..." 
                      value={groupInput} 
                      onChange={(e) => setGroupInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGroup())}
                      className="h-11 rounded-lg border-gray-200"
                    />
                    <Button variant="secondary" size="icon" onClick={handleAddGroup} className="h-11 w-11 rounded-lg">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g, i) => (
                      <div key={i} className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2">
                        {g}
                        <button onClick={() => setGroups(groups.filter((_, idx) => idx !== i))} className="hover:text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Synonyms</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add synonym..." 
                      value={synonymInput} 
                      onChange={(e) => setSynonymInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSynonym())}
                      className="h-11 rounded-lg border-gray-200"
                    />
                    <Button variant="secondary" size="icon" onClick={handleAddSynonym} className="h-11 w-11 rounded-lg">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {synonyms.map((s, i) => (
                      <Badge key={i} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 px-3 py-1 rounded-md text-sm font-medium">
                        {s}
                        <button onClick={() => setSynonyms(synonyms.filter((_, idx) => idx !== i))} className="ml-2 hover:text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Conjugations / Declensions</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add form (e.g. I go, you go...)" 
                      value={conjugationInput} 
                      onChange={(e) => setConjugationInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConjugation())}
                      className="h-11 rounded-lg border-gray-200"
                    />
                    <Button variant="secondary" size="icon" onClick={handleAddConjugation} className="h-11 w-11 rounded-lg">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {conjugations.map((c, i) => (
                      <div key={i} className="bg-primary/5 text-primary border border-primary/10 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between">
                        <span className="flex-1">{c}</span>
                        <button onClick={() => setConjugations(conjugations.filter((_, idx) => idx !== i))} className="ml-2 text-gray-400 hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Links (Definitions, Conjugations, etc.)</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex gap-2">
                      <Input placeholder="Title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} className="flex-1 h-11 rounded-lg border-gray-200" />
                      <Select value={linkType} onValueChange={(v: any) => setLinkType(v)}>
                        <SelectTrigger className="w-[120px] h-11 rounded-lg border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="definition">Def</SelectItem>
                          <SelectItem value="conjugation">Conj</SelectItem>
                          <SelectItem value="declension">Decl</SelectItem>
                          <SelectItem value="example">Ex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="flex-1 h-11 rounded-lg border-gray-200" />
                      <Button variant="secondary" size="icon" onClick={handleAddLink} className="h-11 w-11 rounded-lg">
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3">
                    {links.map(l => (
                      <div key={l.id} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 p-2 rounded-lg px-3">
                        <span className="font-semibold text-gray-700"><span className="text-primary uppercase mr-2">[{l.type}]</span> {l.title}</span>
                        <button onClick={() => setLinks(links.filter(li => li.id !== l.id))} className="text-gray-400 hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <DialogFooter className="pt-4">
          <Button onClick={handleSubmit} className="w-full h-12 rounded-lg bg-primary text-white font-bold text-lg hover:bg-primary/90 shadow-md">Save Term</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TermDetailDialog({ term, tags, topics, onSpeak, open, onOpenChange }: { 
  term: Term, 
  tags: Tag[], 
  topics: Topic[], 
  onSpeak: () => void,
  open: boolean,
  onOpenChange: (open: boolean) => void
}) {
  const topic = topics.find(t => t.id === term.topicId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl p-0 border-none shadow-2xl">
        <div className="relative">
          {term.illustration ? (
            <div className="h-48 w-full relative overflow-hidden">
              <img src={term.illustration} alt={term.term} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                <h2 className="text-3xl font-black text-white tracking-tight">{term.term}</h2>
                <Button size="sm" onClick={onSpeak} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-none rounded-full px-4 font-bold">
                  <Volume2 className="w-4 h-4 mr-2" /> Listen
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 pb-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">{term.term}</h2>
                <Button variant="outline" size="sm" onClick={onSpeak} className="rounded-full font-bold border-gray-200">
                  <Volume2 className="w-4 h-4 mr-2" /> Listen
                </Button>
              </div>
            </div>
          )}

          <div className="p-8 pt-6 space-y-8">
            <div className="flex flex-wrap gap-2">
              {term.translations.map(t => (
                <span key={t.id} className="text-xl font-bold text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                  {t.text}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {term.tags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <span key={tagId} className="text-[11px] font-bold bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full uppercase tracking-wider">
                    #{tag.name}
                  </span>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {term.definitions && term.definitions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Definitions</h4>
                    <div className="space-y-3">
                      {term.definitions.map((d, i) => (
                        <div key={i} className="relative pl-4">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/30 rounded-full" />
                          <p className="text-sm text-gray-700 leading-relaxed font-medium">{d}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {term.examples && term.examples.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Examples</h4>
                    <div className="space-y-3">
                      {term.examples.map((ex, i) => (
                        <p key={i} className="text-sm text-gray-600 italic leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                          "{ex}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {term.synonyms && term.synonyms.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Synonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {term.synonyms.map((s, i) => (
                        <Badge key={i} variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 px-3 py-1 rounded-lg font-medium">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {term.conjugations && term.conjugations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Conjugations / Forms</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {term.conjugations.map((c, i) => (
                        <div key={i} className="bg-primary/5 text-primary px-4 py-2 rounded-xl border border-primary/10 font-bold text-sm">
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {term.groups && term.groups.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {term.groups.map((g, i) => (
                        <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-800 border-amber-100 px-3 py-1 rounded-lg font-bold">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {term.links && term.links.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Related Resources</h4>
                    <div className="space-y-2">
                      {term.links.map(l => (
                        <a 
                          key={l.id} 
                          href={l.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white shadow-sm text-primary">
                              <LinkIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{l.title}</p>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{l.type}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Metadata</h4>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-gray-400">Topic</span>
                      <span className="text-gray-900">{topic?.name || 'Uncategorized'}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-gray-400">Updated</span>
                      <span className="text-gray-900">{new Date(term.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TermCard({ term, onSpeak, onDelete, onCopy, onUpdate, onAddTag, tags, topics, activeDictionary }: { 
  term: Term, 
  onSpeak: () => void, 
  onDelete: () => void,
  onCopy: () => void,
  onUpdate: (id: string, u: Partial<Term>) => void,
  onAddTag: (tag: Tag) => void,
  tags: Tag[],
  topics: Topic[],
  activeDictionary: Dictionary,
  key?: string
}) {
  const topic = topics.find(t => t.id === term.topicId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="group overflow-hidden hover:shadow-xl transition-all border border-gray-200 bg-white rounded-xl cursor-pointer"
        onClick={() => setIsDetailDialogOpen(true)}
      >
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 group-hover:text-primary transition-colors">{term.term}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {term.translations.map(t => (
                    <span key={t.id} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm font-medium">
                      {t.text}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-400 hover:text-primary transition-colors"
                  onClick={(e) => { e.stopPropagation(); onSpeak(); }}
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()} />
                  }>
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-lg shadow-xl border-gray-200" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem 
                      className="gap-2 font-medium" 
                      onClick={(e) => { e.stopPropagation(); setIsEditDialogOpen(true); }}
                    >
                      <Edit2 className="w-4 h-4" /> Edit Word
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 font-medium" 
                      onClick={(e) => { e.stopPropagation(); onCopy(); }}
                    >
                      <Copy className="w-4 h-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-destructive font-medium" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                      <Trash2 className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5">
                {term.tags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span key={tagId} className="text-[11px] font-bold bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full uppercase tracking-wider">
                      #{tag.name}
                    </span>
                  );
                })}
              </div>

              {term.groups && term.groups.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg flex items-center gap-2">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Group:</span>
                  <span className="text-sm font-bold text-amber-900">{term.groups[0]}</span>
                </div>
              )}

              <div className="space-y-4">
                {term.definitions && term.definitions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Definitions</span>
                    <div className="space-y-1">
                      {term.definitions.slice(0, 1).map((d, i) => (
                        <p key={i} className="text-sm text-gray-700 leading-relaxed pl-3 border-l-2 border-primary/20 line-clamp-2">{d}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {topic?.name || 'Uncategorized'}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {new Date(term.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TermDetailDialog 
        term={term} 
        tags={tags} 
        topics={topics} 
        onSpeak={onSpeak}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />

      <TermDialog 
        editingTerm={term}
        onUpdate={onUpdate}
        onAddTag={onAddTag}
        topics={topics}
        tags={tags}
        activeDictionary={activeDictionary}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </motion.div>
  );
}

