# Cursor Implementation Rules and Patterns

## Data Syncing Pattern

### Modal Components (Create/Edit Operations)
1. Use the store's setState functions for optimistic updates
2. Always invalidate the 'all-data' query after operations
3. Pattern for save operations:
```typescript
const onSubmit = async (data: FormData) => {
  try {
    if (existingItem?.id) {
      // Update operation
      const updatedItem = await itemServices.update(existingItem.id.toString(), data) as Item;
      setItems(
        items.map(item => 
          item.id === existingItem.id ? { ...item, ...updatedItem } : item
        )
      );
    } else {
      // Create operation
      const newItem = await itemServices.create(data) as Item;
      if (newItem) {
        setItems([...items, newItem]);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['all-data'] });
    reset();
    onClose();
  } catch (error) {
    console.error('Error saving item:', error);
    alert(error instanceof Error ? error.message : 'Failed to save item');
  }
};
```

### List Components (Delete Operations)
1. Use optimistic updates with store's setState
2. Invalidate queries for sync
3. Pattern for delete operations:
```typescript
const handleDelete = async (id: string) => {
  if (window.confirm('Are you sure you want to delete this item?')) {
    try {
      // Optimistic update
      const updatedItems = items.filter(item => item.id !== id);
      setItems(updatedItems);

      // Perform delete
      await itemServices.delete(id);
      
      // Ensure sync
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
    } catch (error) {
      console.error('Error deleting item:', error);
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
      alert('Failed to delete item');
    }
  }
};
```

## State Management
1. Always use the store's setState functions for updates (from useStore hook)
2. Never modify state directly, always use the setter functions
3. Use useFirebaseQuery for initial data loading
4. Pattern for component state setup:
```typescript
const { isLoading, items: queryItems, itemsError } = useFirebaseQuery();
const { setItems } = useStore();
const items = useMemo(() => queryItems || [], [queryItems]);
```

## Error Handling
1. Always wrap async operations in try-catch blocks
2. Use type assertions for service responses
3. Invalidate queries on error to ensure data consistency
4. Provide user-friendly error messages
5. Log errors to console for debugging

## Data Validation
1. Add null checks before accessing properties
2. Validate data types before operations
3. Pattern for data validation:
```typescript
const filteredItems = items?.filter(item => {
  if (!item || typeof item.name !== 'string') {
    console.warn('Invalid item data:', item);
    return false;
  }
  return true;
});
```

## Query Management
1. Use 'all-data' as the main query key for consistency
2. Invalidate queries after all create/update/delete operations
3. Use optimistic updates for better UX
4. Always handle loading and error states

## Component Structure
1. Separate list and modal components
2. Use consistent naming conventions
3. Follow the same pattern for all CRUD operations
4. Keep UI feedback consistent across components

## Best Practices
1. Use TypeScript types consistently
2. Add console logging for debugging
3. Use proper error boundaries
4. Keep code DRY by following these patterns
5. Document any deviations from these patterns
6. Use proper type assertions (as Type) when working with service responses

## Testing Considerations
1. Add console.log statements during development
2. Monitor network requests
3. Test error scenarios
4. Verify data sync across components

Remember to update these rules as new patterns and best practices are established. 