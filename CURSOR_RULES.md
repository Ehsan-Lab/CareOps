# Cursor Implementation Rules and Patterns

## Project Architecture

### Data Flow Pattern
1. Use Zustand store for global state management
2. Use React Query for server state and caching
3. Use Firebase services for data persistence
4. Follow unidirectional data flow:
   ```
   User Action -> Service Call -> Store Update -> UI Update
   ```

## Data Syncing Pattern

### Modal Components (Create/Edit Operations)
1. Use the store's setState functions for optimistic updates
2. Always invalidate the 'all-data' query after operations
3. Clean data before sending to Firebase:
```typescript
// Remove undefined values and convert empty strings to null
const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
  if (value !== undefined) {
    acc[key] = value === '' ? null : value;
  }
  return acc;
}, {} as Partial<YourType>);
```

4. Pattern for save operations:
```typescript
const onSubmit = async (data: FormData) => {
  try {
    // Clean data
    const cleanData = removeUndefinedValues(data);
    
    if (existingItem?.id) {
      // Handle optimistic update
      setItems(items.map(item => 
        item.id === existingItem.id 
          ? { ...item, ...cleanData } 
          : item
      ));
      
      // Perform update
      const updatedItem = await itemServices.update(
        existingItem.id.toString(), 
        cleanData
      );
      
      // Update store with response
      setItems(items.map(item => 
        item.id === existingItem.id 
          ? { ...item, ...updatedItem } 
          : item
      ));
    } else {
      // Create new item
      const newItem = await itemServices.create(cleanData);
      setItems([...items, newItem]);
    }
    
    // Ensure data consistency
    queryClient.invalidateQueries({ queryKey: ['all-data'] });
    
  } catch (error) {
    console.error('Error:', error);
    queryClient.invalidateQueries({ queryKey: ['all-data'] });
    alert(error instanceof Error ? error.message : 'Operation failed');
  }
};
```

### List Components (Delete Operations)
1. Use optimistic updates with store's setState
2. Handle financial implications before delete
3. Pattern for delete operations:
```typescript
const handleDelete = async (item: Item) => {
  if (!window.confirm('Are you sure?')) return;

  try {
    // Handle financial updates first
    if (item.status === 'COMPLETED') {
      updateTreasuryBalance(item.categoryId, item.amount, true);
    }

    // Optimistic update
    setItems(items.filter(i => i.id !== item.id));
    
    // Perform delete
    await itemServices.delete(item.id);
    
    // Ensure sync
    queryClient.invalidateQueries({ queryKey: ['all-data'] });
  } catch (error) {
    console.error('Error:', error);
    queryClient.invalidateQueries({ queryKey: ['all-data'] });
    alert('Failed to delete');
  }
};
```

## Firebase Integration

### Service Pattern
```typescript
export const itemServices = {
  getAll: async (): Promise<Item[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  create: async (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  update: async (id: string, data: Partial<Item>) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    return {
      id,
      ...data,
      updatedAt: new Date().toISOString()
    };
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
```

## Type Safety

### Form Data Types
1. Define explicit interfaces for form data
2. Handle optional fields properly:
```typescript
interface FormData {
  required: string;
  optional?: string;
  withDefault: string | null;
}

// In component:
const defaultValues = {
  required: '',
  optional: undefined,  // Let it be optional
  withDefault: null     // Explicit null for Firebase
};
```

### ID Handling
1. Always convert IDs to strings when comparing:
```typescript
category.id.toString() === requestId
```

2. Use proper type assertions when needed:
```typescript
const updatedItem = await itemServices.update(id, data) as Item;
```

## Error Handling

### Firebase Operations
1. Clean data before sending to Firebase
2. Handle undefined and null properly
3. Pattern for error handling:
```typescript
try {
  // Clean data
  const cleanData = Object.entries(data)
    .reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value === '' ? null : value;
      }
      return acc;
    }, {} as Partial<YourType>);

  // Perform operation
  await firebaseOperation(cleanData);
} catch (error) {
  console.error('Operation failed:', error);
  queryClient.invalidateQueries({ queryKey: ['all-data'] });
  alert(error instanceof Error ? error.message : 'Operation failed');
}
```

## Financial Operations

### Treasury Updates
1. Always handle financial implications first
2. Use optimistic updates for better UX
3. Pattern for treasury updates:
```typescript
const updateTreasuryBalance = (
  categoryId: string, 
  amount: number, 
  isAdd: boolean
) => {
  setTreasuryCategories(
    categories.map(category =>
      category.id.toString() === categoryId
        ? { 
            ...category, 
            balance: category.balance + (isAdd ? amount : -amount) 
          }
        : category
    )
  );
};
```

## Testing Considerations
1. Test financial calculations thoroughly
2. Verify data sync across components
3. Test error scenarios
4. Verify treasury balance updates
5. Test form validation and data cleaning

Remember to update these rules as new patterns and best practices are established. 