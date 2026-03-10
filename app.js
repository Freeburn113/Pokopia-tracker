const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
    setup() {
        const pokemonList = ref([]);
        const caughtIds = ref(new Set());
        const searchQuery = ref('');
        const filterStatus = ref('all'); // 'all', 'caught', 'uncaught'
        const filterCategory = ref('all'); // 'all', 'regular', 'event'
        const isDark = ref(false);
        const isMenuOpen = ref(false);

        const closeMenu = () => {
            isMenuOpen.value = false;
        };

        // Load data on mount
        onMounted(async () => {
            // Load theme
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                isDark.value = true;
                document.documentElement.classList.add('dark');
            } else {
                isDark.value = false;
                document.documentElement.classList.remove('dark');
            }

            // Load tracked status
            const savedData = localStorage.getItem('pokopia_tracker_data');
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    caughtIds.value = new Set(parsed);
                } catch (e) {
                    console.error("Failed to parse saved data", e);
                }
            }

            // Load Pokemon Data
            try {
                const res = await fetch('pokemon_data.json');
                const data = await res.json();
                pokemonList.value = data;
            } catch (e) {
                console.error("Failed to load pokemon data", e);
            }
        });

        // Watchers
        watch(isDark, (newVal) => {
            if (newVal) {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark';
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light';
            }
        });

        watch(caughtIds, (newVal) => {
            localStorage.setItem('pokopia_tracker_data', JSON.stringify(Array.from(newVal)));
        }, { deep: true });

        // Computed
        const totalCount = computed(() => pokemonList.value.length);
        const caughtCount = computed(() => caughtIds.value.size);

        const progressPercentage = computed(() => {
            if (totalCount.value === 0) return 0;
            return Math.round((caughtCount.value / totalCount.value) * 100);
        });

        const filteredPokemon = computed(() => {
            return pokemonList.value.filter(p => {
                // Search filter
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                    String(p.id).includes(searchQuery.value);

                // Status filter
                let matchesStatus = true;
                if (filterStatus.value === 'caught') {
                    matchesStatus = isCaught(p.id);
                } else if (filterStatus.value === 'uncaught') {
                    matchesStatus = !isCaught(p.id);
                }

                // Category filter
                let matchesCategory = true;
                if (filterCategory.value !== 'all') {
                    matchesCategory = p.category === filterCategory.value;
                }

                return matchesSearch && matchesStatus && matchesCategory;
            });
        });

        // Methods
        const toggleTheme = () => {
            isDark.value = !isDark.value;
        };

        const isCaught = (id) => {
            return caughtIds.value.has(id);
        };

        const toggleCaught = (id) => {
            const newSet = new Set(caughtIds.value);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            caughtIds.value = newSet;
        };

        const getTypeClass = (type) => {
            return type; // Used in CSS class binding
        };

        const exportData = () => {
            const dataStr = JSON.stringify(Array.from(caughtIds.value));
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = 'pokopia_tracker.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        };

        const importData = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const contents = e.target.result;
                    const parsed = JSON.parse(contents);
                    if (Array.isArray(parsed)) {
                        caughtIds.value = new Set(parsed);
                        alert("Data imported successfully!");
                    } else {
                        throw new Error("Invalid format");
                    }
                } catch (error) {
                    alert("Error importing file. Please make sure it's a valid Pokopia Tracker JSON backup.");
                }
                // Reset file input so same file can be imported again if needed
                event.target.value = '';
            };
            reader.readAsText(file);
        };

        const clearData = () => {
            if (confirm("Are you sure you want to clear your captured Pokémon list? This action cannot be undone unless you have an exported backup.")) {
                caughtIds.value = new Set();
            }
        };

        return {
            pokemonList,
            searchQuery,
            filterStatus,
            filterCategory,
            isDark,
            isMenuOpen,
            closeMenu,
            filteredPokemon,
            totalCount,
            caughtCount,
            progressPercentage,
            toggleTheme,
            isCaught,
            toggleCaught,
            getTypeClass,
            exportData,
            importData,
            clearData
        };
    }
}).mount('#app');
